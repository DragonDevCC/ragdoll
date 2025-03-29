"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { FileText, Folder, RefreshCw, ChevronLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

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

type BrowserProps = {
	sourceType: "onedrive" | "sharepoint"
	siteId?: string
	libraryName?: string
	onFileSelect: (file: FileItem) => void
}

export function DocumentBrowser({ sourceType, siteId, libraryName, onFileSelect }: BrowserProps) {
	const [files, setFiles] = useState<FileItem[]>([])
	const [loading, setLoading] = useState(true)
	const [currentPath, setCurrentPath] = useState<string[]>([])
	const [currentFolderId, setCurrentFolderId] = useState<string>("root")
	const [currentDriveId, setCurrentDriveId] = useState<string>("")
	const { toast } = useToast()

	const fetchFiles = async () => {
		setLoading(true)
		try {
			let response

			if (currentFolderId === "root") {
				// Fetch root files
				if (sourceType === "onedrive") {
					response = await fetch("/api/documents/folder?driveId=me&folderId=root")
				} else if (sourceType === "sharepoint" && siteId) {
					response = await fetch(`/api/documents/folder?driveId=${siteId}&folderId=root`)
				}
			} else {
				// Fetch folder contents
				response = await fetch(`/api/documents/folder?driveId=${currentDriveId}&folderId=${currentFolderId}`)
			}

			if (!response || !response.ok) {
				throw new Error("Failed to fetch files")
			}

			const data = await response.json()

			const items = data.items.map((item: any) => ({
				id: item.id,
				name: item.name,
				size: item.size,
				lastModified: item.lastModifiedDateTime,
				isFolder: item.folder !== undefined,
				driveId: item.parentReference?.driveId || currentDriveId,
			}))

			setFiles(items)

			// Set drive ID if not already set
			if (!currentDriveId && items.length > 0 && items[0].driveId) {
				setCurrentDriveId(items[0].driveId)
			}
		} catch (error: any) {
			console.error("Error fetching files:", error)
			toast({
				title: "Error",
				description: error.message || "Failed to fetch files",
				variant: "destructive",
			})
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		fetchFiles()
	}, [sourceType, siteId, libraryName])

	const handleFolderClick = async (folder: FileItem) => {
		setLoading(true)
		try {
			// Navigate into the folder
			setCurrentPath([...currentPath, folder.name])
			setCurrentFolderId(folder.id)

			// Fetch folder contents
			const response = await fetch(
				`/api/documents/folder?driveId=${folder.driveId || currentDriveId}&folderId=${folder.id}`,
			)

			if (!response.ok) {
				throw new Error("Failed to fetch folder contents")
			}

			const data = await response.json()

			setFiles(
				data.items.map((item: any) => ({
					id: item.id,
					name: item.name,
					size: item.size,
					lastModified: item.lastModifiedDateTime,
					isFolder: item.folder !== undefined,
					driveId: item.parentReference?.driveId || currentDriveId,
				})),
			)
		} catch (error: any) {
			console.error("Error fetching folder contents:", error)
			toast({
				title: "Error",
				description: error.message || "Failed to fetch folder contents",
				variant: "destructive",
			})
		} finally {
			setLoading(false)
		}
	}

	const handleFileClick = (file: FileItem) => {
		onFileSelect(file)
	}

	const handleBack = async () => {
		if (currentPath.length === 0) return

		setLoading(true)
		try {
			// Remove the last folder from the path
			const newPath = [...currentPath]
			newPath.pop()
			setCurrentPath(newPath)

			// If we're going back to root
			if (newPath.length === 0) {
				setCurrentFolderId("root")
				fetchFiles()
				return
			}

			// Otherwise, fetch the parent folder contents
			const response = await fetch(`/api/documents/parent?driveId=${currentDriveId}&folderId=${currentFolderId}`)

			if (!response.ok) {
				throw new Error("Failed to navigate back")
			}

			const data = await response.json()

			setCurrentFolderId(data.parentId)
			setFiles(
				data.items.map((item: any) => ({
					id: item.id,
					name: item.name,
					size: item.size,
					lastModified: item.lastModifiedDateTime,
					isFolder: item.folder !== undefined,
					driveId: item.parentReference?.driveId || currentDriveId,
				})),
			)
		} catch (error: any) {
			console.error("Error navigating back:", error)
			toast({
				title: "Error",
				description: error.message || "Failed to navigate back",
				variant: "destructive",
			})
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center space-x-2">
					<Button variant="outline" size="sm" onClick={handleBack} disabled={currentPath.length === 0 || loading}>
						<ChevronLeft className="h-4 w-4 mr-1" />
						Back
					</Button>
					<div className="text-sm text-muted-foreground">
						{currentPath.length === 0 ? "Root" : currentPath.join(" / ")}
					</div>
				</div>
				<Button variant="ghost" size="sm" onClick={fetchFiles} disabled={loading}>
					<RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
				</Button>
			</div>

			<div className="border rounded-md">
				{loading ? (
					<div className="p-4 space-y-3">
						{[1, 2, 3, 4, 5].map((i) => (
							<div key={i} className="flex items-center space-x-4">
								<Skeleton className="h-10 w-10 rounded-md" />
								<Skeleton className="h-4 w-full" />
							</div>
						))}
					</div>
				) : files.length === 0 ? (
					<div className="p-8 text-center text-muted-foreground">No files found in this location</div>
				) : (
					<div className="divide-y">
						{files.map((file) => (
							<div
								key={file.id}
								className="p-3 flex items-center space-x-3 hover:bg-muted/50 cursor-pointer"
								onClick={() => (file.isFolder ? handleFolderClick(file) : handleFileClick(file))}
							>
								{file.isFolder ? (
									<Folder className="h-5 w-5 text-blue-500" />
								) : (
									<FileText className="h-5 w-5 text-gray-500" />
								)}
								<div className="flex-1 min-w-0">
									<div className="text-sm font-medium truncate">{file.name}</div>
									{file.size && <div className="text-xs text-muted-foreground">{formatFileSize(file.size)}</div>}
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	)
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
	if (bytes < 1024) return bytes + " B"
	else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
	else if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB"
	else return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB"
}

