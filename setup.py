"""
Setup configuration for Chirality Semantic Framework.
"""

from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="chirality-framework",
    version="14.3.0",
    author="Chirality Framework Team",
    description="Clean implementation of CF14 semantic protocol",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/sgttomas/Chirality-Framework",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "Topic :: Software Development :: Libraries",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
    python_requires=">=3.9",
    install_requires=[
        # Keep core runtime minimal; optional deps via extras
        "python-dotenv>=1.0.0",
    ],
    extras_require={
        "openai": [
            "openai>=1.0.0",
        ],
        "neo4j": [
            "neo4j>=5.0.0",
        ],
        "dev": [
            "pytest>=7.0.0",
            "pytest-cov>=4.0.0",
            "black>=22.0.0",
            "mypy>=1.0.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "chirality=chirality.cli:main",
        ],
    },
    package_data={
        "chirality": ["*.txt", "*.json", "tests/fixtures/*.json"],
    },
)