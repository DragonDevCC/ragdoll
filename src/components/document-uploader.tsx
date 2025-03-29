"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { FileUp, X, Check, File } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function DocumentUploader() {
	const [files, setFiles] = useState<File[]>([])
	const [uploading, setUploading] = useState(false)
	const [progress, setProgress] = useState<Record<string, number>>({})
	const [completed, setCompleted] = useState<string[]>([])
	const fileInputRef = useRef<HTMLInputElement>(null)
	const { toast } = useToast()

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files) {
			const newFiles = Array.from(e.target.files)
			setFiles((prev) => [...prev, ...newFiles])
			e.target.value = ""
		}
	}

	const handleRemoveFile = (fileName: string) => {
		setFiles((prev) => prev.filter((file) => file.name !== fileName))
	}

	const handleUpload = async () => {
		if (files.length === 0) return

		setUploading(true)
		const initialProgress = files.reduce(
			(acc, file) => {
				acc[file.name] = 0
				return acc
			},
			{} as Record<string, number>,
		)

		setProgress(initialProgress)
		setCompleted([])

		try {
			await Promise.all(
				files.map(async (file) => {
					// Create form data
					const formData = new FormData()
					formData.append("file", file)

					// Simulate progress updates
					const progressInterval = setInterval(() => {
						setProgress((prev) => {
							const currentProgress = prev[file.name] || 0
							if (currentProgress < 90) {
								return {
									...prev,
									[file.name]: currentProgress + 10,
								}
							}
							return prev
						})
					}, 500)

					try {
						// Upload file
						const response = await fetch("/api/documents/upload", {
							method: "POST",
							body: formData,
						})

						clearInterval(progressInterval)

						if (!response.ok) {
							const error = await response.json()
							throw new Error(error.error || "Upload failed")
						}

						// Set progress to 100% and mark as completed
						setProgress((prev) => ({
							...prev,
							[file.name]: 100,
						}))

						setCompleted((prev) => [...prev, file.name])

						toast({
							title: "Document processed",
							description: `${file.name} has been successfully processed and indexed.`,
						})
					} catch (error: any) {
						clearInterval(progressInterval)
						console.error(`Error uploading ${file.name}:`, error)

						toast({
							title: "Upload failed",
							description: error.message || `Failed to upload ${file.name}`,
							variant: "destructive",
						})
					}
				}),
			)
		} finally {
			setUploading(false)
		}
	}

	return (
		<div className="space-y-4">
			<div
				className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
				onClick={() => fileInputRef.current?.click()}
			>
				<FileUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
				<p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
				<p className="text-xs text-muted-foreground mt-1">PDF, DOCX, PPTX, XLSX, JPG, PNG (max 50MB)</p>
				<input
					type="file"
					ref={fileInputRef}
					className="hidden"
					multiple
					accept=".pdf,.docx,.pptx,.xlsx,.jpg,.jpeg,.png"
					onChange={handleFileChange}
				/>
			</div>

			{files.length > 0 && (
				<div className="space-y-2">
					<div className="text-sm font-medium">Selected files ({files.length})</div>
					<div className="space-y-2 max-h-40 overflow-y-auto">
						{files.map((file) => (
							<div key={file.name} className="flex items-center justify-between bg-muted/30 p-2 rounded-md">
								<div className="flex items-center space-x-2">
									<File className="h-4 w-4 text-muted-foreground" />
									<span className="text-sm truncate max-w-[180px]">{file.name}</span>
								</div>
								<div className="flex items-center space-x-2">
									{uploading && !completed.includes(file.name) && (
										<Progress value={progress[file.name]} className="w-16 h-2" />
									)}
									{completed.includes(file.name) ? (
										<Check className="h-4 w-4 text-green-500" />
									) : (
										<button
											onClick={() => handleRemoveFile(file.name)}
											disabled={uploading}
											className="text-muted-foreground hover:text-foreground"
										>
											<X className="h-4 w-4" />
										</button>
									)}
								</div>
							</div>
						))}
					</div>
					<Button onClick={handleUpload} disabled={uploading || files.length === 0} className="w-full">
						{uploading ? "Processing..." : "Upload and Process"}
					</Button>
				</div>
			)}
		</div>
	)
}

