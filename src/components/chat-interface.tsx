"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Bot, User, FileText, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type Message = {
	id: string
	role: "user" | "assistant"
	content: string
	sources?: {
		title: string
		page: number
		content: string
	}[]
}

export function ChatInterface() {
	const [messages, setMessages] = useState<Message[]>([])
	const [input, setInput] = useState("")
	const [loading, setLoading] = useState(false)
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const { toast } = useToast()

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
	}

	useEffect(() => {
		scrollToBottom()
	}, [messages])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!input.trim() || loading) return

		const userMessage: Message = {
			id: Date.now().toString(),
			role: "user",
			content: input,
		}

		setMessages((prev) => [...prev, userMessage])
		setInput("")
		setLoading(true)

		try {
			const response = await fetch("/api/rag", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ question: input }),
			})

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.error || "Failed to process question")
			}

			const data = await response.json()

			const assistantMessage: Message = {
				id: (Date.now() + 1).toString(),
				role: "assistant",
				content: data.text,
				sources: data.sources,
			}

			setMessages((prev) => [...prev, assistantMessage])
		} catch (error: any) {
			console.error("Error asking question:", error)

			toast({
				title: "Error",
				description: error.message || "Failed to process your question",
				variant: "destructive",
			})

			const errorMessage: Message = {
				id: (Date.now() + 1).toString(),
				role: "assistant",
				content: "Sorry, I encountered an error processing your question. Please try again.",
			}

			setMessages((prev) => [...prev, errorMessage])
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="flex flex-col h-full">
			<div className="flex-1 overflow-y-auto p-4 space-y-4">
				{messages.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
						<Bot className="h-12 w-12 mb-4" />
						<h3 className="text-lg font-medium">Ask questions about your documents</h3>
						<p className="max-w-md">
							Upload documents or connect to document sources, then ask questions to get insights from your content.
						</p>
					</div>
				) : (
					messages.map((message) => (
						<div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
							<div
								className={`max-w-[80%] rounded-lg p-3 ${
									message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
								}`}
							>
								<div className="flex items-center space-x-2 mb-1">
									{message.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
									<span className="text-xs font-medium">{message.role === "user" ? "You" : "Assistant"}</span>
								</div>
								<div className="text-sm whitespace-pre-wrap">{message.content}</div>

								{message.sources && message.sources.length > 0 && (
									<div className="mt-2 pt-2 border-t border-border/50">
										<div className="text-xs font-medium mb-1">Sources:</div>
										<div className="space-y-1">
											{message.sources.map((source, index) => (
												<div key={index} className="text-xs flex items-start space-x-1">
													<FileText className="h-3 w-3 mt-0.5 flex-shrink-0" />
													<div>
														<span className="font-medium">{source.title}</span>
														{source.page && <span> (p. {source.page})</span>}
													</div>
												</div>
											))}
										</div>
									</div>
								)}
							</div>
						</div>
					))
				)}
				<div ref={messagesEndRef} />
			</div>

			<div className="border-t p-4">
				<form onSubmit={handleSubmit} className="flex space-x-2">
					<Input
						value={input}
						onChange={(e) => setInput(e.target.value)}
						placeholder="Ask a question about your documents..."
						disabled={loading}
						className="flex-1"
					/>
					<Button type="submit" size="icon" disabled={loading || !input.trim()}>
						{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
					</Button>
				</form>
			</div>
		</div>
	)
}

