"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function DatabaseSetup() {
	const [initializing, setInitializing] = useState(false)
	const { toast } = useToast()

	const initializeDatabase = async () => {
		setInitializing(true)

		try {
			const response = await fetch("/api/init-db", {
				method: "POST",
			})

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.error || "Failed to initialize database")
			}

			toast({
				title: "Database initialized",
				description: "The database has been successfully set up for vector search.",
			})
		} catch (error: any) {
			console.error("Error initializing database:", error)

			toast({
				title: "Initialization failed",
				description: error.message || "Failed to initialize database",
				variant: "destructive",
			})
		} finally {
			setInitializing(false)
		}
	}

	return (
		<Button onClick={initializeDatabase} disabled={initializing} variant="outline" size="sm">
			{initializing ? (
				<>
					<Loader2 className="h-4 w-4 mr-2 animate-spin" />
					Initializing...
				</>
			) : (
				"Initialize Database"
			)}
		</Button>
	)
}

