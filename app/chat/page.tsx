'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Send, Bot, User, Database, Grid3X3, ExternalLink, Loader2 } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  metadata?: {
    matrices_referenced?: string[]
    neo4j_queries?: number
    confidence?: number
  }
}

interface MatrixReference {
  id: string
  name: string
  station: string
  relevant_cells: string[]
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I can help you explore your instantiated Chirality Framework. Ask me about requirements, objectives, or solutions from your domain knowledge.',
      timestamp: new Date(),
      metadata: {
        matrices_referenced: [],
        neo4j_queries: 0,
        confidence: 1.0
      }
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [availableMatrices, setAvailableMatrices] = useState<MatrixReference[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    loadAvailableMatrices()
  }, [])

  const loadAvailableMatrices = async () => {
    try {
      const response = await fetch('/api/chat/matrices', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        const data = await response.json()
        setAvailableMatrices(data.matrices || [])
      }
    } catch (error) {
      console.error('Failed to load matrices:', error)
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          conversation_history: messages.slice(-5)
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        metadata: {
          matrices_referenced: data.matrices_referenced || [],
          neo4j_queries: data.neo4j_queries || 0,
          confidence: data.confidence || 0.8
        }
      }

      setMessages(prev => [...prev, assistantMessage])

    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
        metadata: { confidence: 0 }
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatMessage = (content: string) => {
    return content.replace(
      /Matrix [A-Z]\((\d+),(\d+)\)/g,
      '<span class="font-mono text-blue-600 bg-blue-50 px-1 rounded">Matrix $1($2,$3)</span>'
    )
  }

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'bg-gray-100'
    if (confidence >= 0.8) return 'bg-green-100 text-green-800'
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  return (
    <div className="flex h-screen max-w-6xl mx-auto">
      <div className="flex-1 flex flex-col">
        <div className="border-b p-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6" />
            Framework Assistant
          </h1>
          <p className="text-gray-600">Chat with your instantiated Chirality Framework</p>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  
                  <div className={`rounded-lg p-3 ${
                    message.role === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <div 
                      dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                    />
                    
                    {message.metadata && message.role === 'assistant' && (
                      <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                        {message.metadata.matrices_referenced && message.metadata.matrices_referenced.length > 0 && (
                          <div className="flex items-center gap-1 text-xs">
                            <Database className="h-3 w-3" />
                            <span>Referenced: {message.metadata.matrices_referenced.join(', ')}</span>
                          </div>
                        )}
                        {message.metadata.confidence !== undefined && (
                          <Badge variant="outline" className={`text-xs ${getConfidenceColor(message.metadata.confidence)}`}>
                            Confidence: {(message.metadata.confidence * 100).toFixed(0)}%
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex gap-3 max-w-[80%]">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-gray-100 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Querying framework...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about your domain requirements, objectives, or solutions..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button onClick={sendMessage} disabled={!input.trim() || isLoading}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Press Enter to send, Shift+Enter for new line
          </div>
        </div>
      </div>

      <div className="w-80 border-l bg-gray-50">
        <div className="p-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Grid3X3 className="h-4 w-4" />
                Available Knowledge
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {availableMatrices.length > 0 ? (
                availableMatrices.map((matrix, index) => (
                  <div key={`${matrix.id}-${index}`} className="p-2 bg-white rounded border text-sm">
                    <div className="font-medium">{matrix.name}</div>
                    <div className="text-xs text-gray-500">{matrix.station}</div>
                    {matrix.relevant_cells.length > 0 && (
                      <div className="text-xs text-blue-600 mt-1">
                        {matrix.relevant_cells.length} cells available
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500 text-center py-4">
                  No matrices found. 
                  <a href="/instantiate" className="text-blue-500 hover:underline ml-1">
                    Instantiate a domain first
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <ExternalLink className="h-3 w-3 mr-2" />
                View Matrices
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Database className="h-3 w-3 mr-2" />
                Export Knowledge
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Grid3X3 className="h-3 w-3 mr-2" />
                New Instantiation
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Sample Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="space-y-1">
                <button 
                  className="text-xs text-left text-blue-600 hover:underline block"
                  onClick={() => setInput("What are the key requirements for reliable knowledge generation?")}
                >
                  "What are the key requirements for reliable knowledge generation?"
                </button>
                <button 
                  className="text-xs text-left text-blue-600 hover:underline block"
                  onClick={() => setInput("Show me the objectives for data and information handling")}
                >
                  "Show me the objectives for data and information handling"
                </button>
                <button 
                  className="text-xs text-left text-blue-600 hover:underline block"
                  onClick={() => setInput("How do normative standards relate to framework implementation?")}
                >
                  "How do normative standards relate to framework implementation?"
                </button>
                <button 
                  className="text-xs text-left text-blue-600 hover:underline block"
                  onClick={() => setInput("Compare the solution objectives across all three levels")}
                >
                  "Compare the solution objectives across all three levels"
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}