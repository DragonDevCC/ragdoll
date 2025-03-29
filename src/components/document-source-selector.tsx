"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Database, HardDrive, Cloud } from "lucide-react"
import { connectToSource } from "@/lib/document-sources"
import { MicrosoftLoginButton } from "@/components/microsoft-login-button"
import { DocumentBrowser } from "@/components/document-browser"
import { useToast } from "@/hooks/use-toast"

const sources = [
	{
		id: "sharepoint",
		name: "SharePoint",
		icon: <Database className="h-5 w-5" />,
		description: "Connect to your SharePoint document libraries",
	},
	{
		id: "onedrive",
		name: "OneDrive",
		icon: <Cloud className="h-5 w-5" />,
		description: "Access your OneDrive files and folders",
	},
	{
		id: "local",
		name: "Local Files",
		icon: <HardDrive className="h-5 w-5" />,
		description: "Upload files from your device",
	},
	{
		id: "other",
		name: "Other Sources",
		icon: <FileText className="h-5 w-5" />,
		description: "Connect to Google Drive, Dropbox, etc.",
	},
]

type FileItem = {
	id: string
	name: string
	size?: number
	lastModified?: string
	isFolder: boolean
	driveId?: string
	parentReference?: {
		driveId: string
		id: string
	}
}

export function DocumentSourceSelector() {
	const [connecting, setConnecting] = useState<string | null>(null)
	const [connectedSources, setConnectedSources] = useState<string[]>([])
	const [selectedSource, setSelectedSource] = useState<string | null>(null)
	const [processingFile, setProcessingFile] = useState<string | null>(null)
	const { toast } = useToast()

	const handleConnect = async (sourceId: string) => {
		setConnecting(sourceId)
		try {
			await connectToSource(sourceId)
			setConnectedSources((prev) => [...prev, sourceId])
			setSelectedSource(sourceId)

			toast({
				title: "Connected",
				description: `Successfully connected to ${sourceId}`,
			})
		} catch (error: any) {
			console.error("Failed to connect:", error)
			toast({
				title: "Connection failed",
				description: error.message || `Failed to connect to ${sourceId}`,
				variant: "destructive",
			})
		} finally {
			setConnecting(null)
		}
	}

	const handleFileSelect = async (file: FileItem) => {
		if (file.isFolder) return

		setProcessingFile(file.id)
		try {
			// Process the selected file
			const response = await fetch("/api/documents/process", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					driveId: file.driveId,
					itemId: file.id,
					fileName: file.name,
				}),
			})

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.error || "Failed to process file")
			}

			const data = await response.json()

			toast({
				title: "Document processed",
				description: `${file.name} has been successfully processed and indexed.`,
			})
		} catch (error: any) {
			console.error("Error processing file:", error)
			toast({
				title: "Processing failed",
				description: error.message || `Failed to process ${file.name}`,
				variant: "destructive",
			})
		} finally {
			setProcessingFile(null)
		}
	}

	return (
		<div className="space-y-4">
			{selectedSource ? (
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<h3 className="text-sm font-medium">{sources.find((s) => s.id === selectedSource)?.name} Files</h3>
						<Button variant="ghost" size="sm" onClick={() => setSelectedSource(null)}>
							Back to Sources
						</Button>
					</div>

					{selectedSource === "onedrive" && <DocumentBrowser sourceType="onedrive" onFileSelect={handleFileSelect} />}

					{selectedSource === "sharepoint" && (
						<DocumentBrowser
							sourceType="sharepoint"
							siteId="root" // You would need to implement site selection
							onFileSelect={handleFileSelect}
						/>
					)}
				</div>
			) : (
				<div className="grid gap-4">
					{sources.map((source) => (
						<Card key={source.id} className={connectedSources.includes(source.id) ? "border-green-500" : ""}>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">{source.name}</CardTitle>
								{source.icon}
							</CardHeader>
							<CardContent>
								<CardDescription>{source.description}</CardDescription>
							</CardContent>
							{source.id === "sharepoint" || source.id === "onedrive" ? (
								<CardFooter>
									{connectedSources.includes(source.id) ? (
										<Button variant="outline" size="sm" className="w-full" onClick={() => setSelectedSource(source.id)}>
											Browse Files
										</Button>
									) : (
										<MicrosoftLoginButton />
									)}
								</CardFooter>
							) : (
								<CardFooter>
									<Button
										variant={connectedSources.includes(source.id) ? "outline" : "default"}
										size="sm"
										className="w-full"
										onClick={() => handleConnect(source.id)}
										disabled={connecting === source.id}
									>
										{connecting === source.id
											? "Connecting..."
											: connectedSources.includes(source.id)
												? "Connected"
												: "Connect"}
									</Button>
								</CardFooter>
							)}
						</Card>
					))}
				</div>
			)}
		</div>
	)
}

