import {NextResponse} from "next/server"
import {v4 as uuidv4} from "uuid"
import {cookies} from "next/headers"

export async function GET() {
	// Microsoft OAuth configuration
	const clientId = process.env.MS_CLIENT_ID || ""
	const redirectUri = process.env.NEXTAUTH_URL ? `${process.env.NEXTAUTH_URL}/api/auth/callback/microsoft` : ""
	const tenantId = process.env.MS_TENANT_ID || "common"

	// Scopes needed for Microsoft Graph API
	const scopes = ["Files.Read", "Files.Read.All", "Sites.Read.All", "User.Read", "offline_access"].join(" ")

	// Generate a state parameter to prevent CSRF
	const state = uuidv4()

	// Store state in cookie for validation later
	cookies().set("ms_auth_state", state, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		maxAge: 60 * 15, // 15 minutes
	})

	// Construct the authorization URL
	const authUrl = new URL(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`)
	authUrl.searchParams.append("client_id", clientId)
	authUrl.searchParams.append("response_type", "code")
	authUrl.searchParams.append("redirect_uri", redirectUri)
	authUrl.searchParams.append("scope", scopes)
	authUrl.searchParams.append("state", state)
	authUrl.searchParams.append("response_mode", "query")

	// Redirect to Microsoft login
	return NextResponse.redirect(authUrl.toString())
}

