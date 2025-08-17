"""
Command-line interface for Chirality Framework.

Usage:
    python -m chirality.cli run --thread "user:session" --A fixtures/A.json --B fixtures/B.json
    python -m chirality.cli run --thread "demo:test" --A A.json --B B.json --write-neo4j
    python -m chirality.cli run --thread "demo:test" --A A.json --B B.json --write-cf14-neo4j
"""

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Optional

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from .core.types import Matrix
from .core.ops import OpenAIResolver, EchoResolver
from .core.stations import S1Runner, S2Runner, S3Runner
from .core.serialize import load_matrix, save_matrix, export_pipeline_results, format_matrix_summary
from .adapters.neo4j_adapter import Neo4jAdapter

try:
    from .exporters.neo4j_cf14_exporter import CF14Neo4jExporter
except ImportError:
    CF14Neo4jExporter = None  # optional dependency


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Chirality Framework CF14 CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Commands")
    
    # Run command
    run_parser = subparsers.add_parser("run", help="Run CF14 pipeline")
    run_parser.add_argument("--thread", required=True, help="Thread ID (e.g., 'user:session')")
    run_parser.add_argument("--A", required=True, help="Path to Matrix A JSON file")
    run_parser.add_argument("--B", required=True, help="Path to Matrix B JSON file")
    run_parser.add_argument("--output", default="output", help="Output directory (default: output)")
    run_parser.add_argument("--resolver", choices=["openai", "echo"], default="echo",
                           help="Resolver to use (default: echo)")
    run_parser.add_argument("--hitl", action="store_true", help="Enable Human-In-The-Loop")
    run_parser.add_argument("--write-neo4j", action="store_true", help="Write results to Neo4j (legacy adapter)")
    run_parser.add_argument("--write-cf14-neo4j", action="store_true", help="Write CF14 matrices to Neo4j (CF14 schema)")
    run_parser.add_argument("--neo4j-uri", default=os.getenv("NEO4J_URI", "bolt://localhost:7687"), help="Neo4j URI")
    run_parser.add_argument("--neo4j-user", default=os.getenv("NEO4J_USER", "neo4j"), help="Neo4j username")
    run_parser.add_argument("--neo4j-password", default=os.getenv("NEO4J_PASSWORD", "password"), help="Neo4j password")
    
    # Validate command
    validate_parser = subparsers.add_parser("validate", help="Validate matrix files")
    validate_parser.add_argument("files", nargs="+", help="Matrix JSON files to validate")
    
    # Convert command
    convert_parser = subparsers.add_parser("convert", help="Convert matrix formats")
    convert_parser.add_argument("input", help="Input matrix file")
    convert_parser.add_argument("--format", choices=["json", "csv"], default="json",
                               help="Output format")
    
    args = parser.parse_args()
    
    if args.command == "run":
        run_pipeline(args)
    elif args.command == "validate":
        validate_matrices(args)
    elif args.command == "convert":
        convert_matrix(args)
    else:
        parser.print_help()
        sys.exit(1)


def run_pipeline(args):
    """Run the CF14 pipeline."""
    print(f"Chirality Framework CF14 Pipeline")
    print(f"Thread: {args.thread}")
    print(f"=" * 50)
    
    # Load input matrices
    print(f"\nLoading matrices...")
    try:
        matrix_a = load_matrix(args.A)
        print(f"  Matrix A loaded: {matrix_a.dimensions}")
        
        matrix_b = load_matrix(args.B)
        print(f"  Matrix B loaded: {matrix_b.dimensions}")
    except Exception as e:
        print(f"Error loading matrices: {e}")
        sys.exit(1)
    
    # Create resolver
    if args.resolver == "openai":
        if not os.getenv("OPENAI_API_KEY"):
            print("Error: OPENAI_API_KEY environment variable required for OpenAI resolver")
            sys.exit(1)
        resolver = OpenAIResolver()
        print(f"\nUsing OpenAI resolver")
    else:
        resolver = EchoResolver()
        print(f"\nUsing Echo resolver (test mode)")
    
    # Create context
    context = {
        "thread_id": args.thread,
        "valley": {
            "stations": [
                {"name": "Problem Statement", "index": 0},
                {"name": "Requirements", "index": 1},
                {"name": "Objectives", "index": 2},
                {"name": "Solution", "index": 3}
            ]
        }
    }
    
    # Run stations
    print(f"\nRunning pipeline...")
    
    # S1: Problem formulation
    context["station"] = {"name": "Problem Statement", "index": 0}
    s1 = S1Runner(resolver, enable_hitl=args.hitl)
    s1_results = s1.run({"A": matrix_a, "B": matrix_b}, context)
    print(f"  S1 complete: A={s1_results['A'].dimensions}, B={s1_results['B'].dimensions}")
    
    # S2: Requirements analysis
    context["station"] = {"name": "Requirements", "index": 1}
    s2 = S2Runner(resolver, enable_hitl=args.hitl)
    s2_results = s2.run(s1_results, context)
    print(f"  S2 complete: C={s2_results['C'].dimensions} ({len(s2_results['C'].cells)} cells)")
    
    # S3: Objective synthesis
    context["station"] = {"name": "Objectives", "index": 2}
    s3 = S3Runner(resolver, enable_hitl=args.hitl)
    s3_results = s3.run(s2_results, context)
    print(f"  S3 complete: J={s3_results['J'].dimensions}, F={s3_results['F'].dimensions}, D={s3_results['D'].dimensions}")
    
    # Export results
    print(f"\nExporting results to {args.output}/...")
    paths = export_pipeline_results(s3_results, args.output)
    for name, path in paths.items():
        print(f"  {name}: {path}")
    
    # Write to Neo4j if requested
    if args.write_neo4j:
        print(f"\nWriting to Neo4j (legacy adapter)...")
        try:
            neo4j = Neo4jAdapter(args.neo4j_uri, args.neo4j_user, args.neo4j_password)
            
            for name, matrix in s3_results.items():
                neo4j.save_matrix(matrix, args.thread)
                print(f"  Saved {name} to Neo4j")
            
            # Create lineage
            if "C" in s3_results:
                neo4j.create_lineage(["A", "B"], s3_results["C"].id, "multiply")
            if "J" in s3_results:
                neo4j.create_lineage([s3_results["C"].id], s3_results["J"].id, "interpret")
            
            neo4j.close()
            print(f"  Neo4j write complete")
        except Exception as e:
            print(f"  Neo4j write failed: {e}")
    
    # Write CF14 matrices to Neo4j if requested
    if args.write_cf14_neo4j:
        print(f"\nWriting CF14 matrices to Neo4j...")
        try:
            if CF14Neo4jExporter is None:
                print("  Error: CF14Neo4jExporter not available. Install neo4j dependency.")
            else:
                # Convert matrices to simple 2D structure for export
                matrices_dict = {}
                for name, matrix in s3_results.items():
                    # Create 2D matrix representation
                    dimensions = matrix.dimensions
                    matrix_2d = [[0.0 for _ in range(dimensions[1])] for _ in range(dimensions[0])]
                    
                    # Fill with cell values (using 1.0 for non-zero cells as weights)
                    for cell in matrix.cells:
                        if cell.row < dimensions[0] and cell.col < dimensions[1]:
                            matrix_2d[cell.row][cell.col] = 1.0  # Weight representing presence
                    
                    matrices_dict[name] = matrix_2d
                
                exporter = CF14Neo4jExporter()
                exporter.export(matrices_dict, args.thread)
                exporter.close()
                print(f"  ✅ CF14 matrices exported to Neo4j (labels: CFMatrix, CFNode)")
        except Exception as e:
            print(f"  CF14 Neo4j export failed: {e}")
    
    print(f"\nPipeline complete!")
    
    # Print summary
    print(f"\nResults summary:")
    for name in ["C", "J", "F", "D"]:
        if name in s3_results:
            matrix = s3_results[name]
            if matrix.cells:
                sample = matrix.cells[0].content.get("text", "")[:100]
                print(f"  {name}: {sample}...")


def validate_matrices(args):
    """Validate matrix files."""
    from .core.validate import validate_matrix
    
    for filepath in args.files:
        print(f"\nValidating {filepath}...")
        try:
            matrix = load_matrix(filepath)
            errors = validate_matrix(matrix)
            
            if errors:
                print(f"  Validation errors:")
                for error in errors:
                    print(f"    - {error}")
            else:
                print(f"  ✓ Valid matrix: {matrix.type.value} {matrix.dimensions}")
        except Exception as e:
            print(f"  ✗ Failed to load: {e}")


def convert_matrix(args):
    """Convert matrix format."""
    print(f"Converting {args.input} to {args.format}...")
    
    try:
        matrix = load_matrix(args.input)
        
        if args.format == "json":
            output_path = Path(args.input).with_suffix(".converted.json")
            save_matrix(matrix, output_path)
        elif args.format == "csv":
            # Simple CSV export
            output_path = Path(args.input).with_suffix(".csv")
            with open(output_path, "w") as f:
                f.write("row,col,text\n")
                for cell in matrix.cells:
                    text = cell.content.get("text", "").replace('"', '""')
                    f.write(f'{cell.row},{cell.col},"{text}"\n')
        
        print(f"  Saved to {output_path}")
    except Exception as e:
        print(f"  Conversion failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()