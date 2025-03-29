"use client"

import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export function MicrosoftLoginButton() {
	const [isLoading, setIsLoading] = useState(false)
	const [isAuthenticated, setIsAuthenticated] = useState(false)
	const router = useRouter()

	useEffect(() => {
		// Check if user is authenticated by looking for the non-httpOnly cookie
		const msAuthenticated = document.cookie.split("; ").find((row) => row.startsWith("ms_authenticated="))

		setIsAuthenticated(!!msAuthenticated)
	}, [])

	const handleLogin = () => {
		setIsLoading(true)
		window.location.href = "/api/auth/microsoft"
	}

	const handleLogout = async () => {
		setIsLoading(true)
		try {
			// Clear cookies
			document.cookie = "ms_authenticated=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;"

			// Call logout API
			await fetch("/api/auth/logout", { method: "POST" })

			setIsAuthenticated(false)
			router.refresh()
		} catch (error) {
			console.error("Logout error:", error)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<Button
			onClick={isAuthenticated ? handleLogout : handleLogin}
			disabled={isLoading}
			variant={isAuthenticated ? "outline" : "default"}
			className="w-full"
		>
			{isLoading ? "Processing..." : isAuthenticated ? "Disconnect Microsoft" : "Connect with Microsoft"}
		</Button>
	)
}

