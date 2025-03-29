import { Client } from "@microsoft/microsoft-graph-client"
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials"
import { ClientSecretCredential } from "@azure/identity"

// Create a credential using client credentials flow
function createCredential() {
	const tenantId = process.env.MS_TENANT_ID!
	const clientId = process.env.MS_CLIENT_ID!
	const clientSecret = process.env.MS_CLIENT_SECRET!

	if (!tenantId || !clientId || !clientSecret) {
		throw new Error("Missing Microsoft Graph API credentials")
	}

	return new ClientSecretCredential(tenantId, clientId, clientSecret)
}

// Create Microsoft Graph client with proper authentication
export function createGraphClient() {
	const credential = createCredential()

	const authProvider = new TokenCredentialAuthenticationProvider(credential, {
		scopes: ["https://graph.microsoft.com/.default"],
	})

	return Client.init({
		authProvider,
		debugLogging: process.env.NODE_ENV !== "production",
	})
}

// Get user details using access token
export async function getUserDetails(accessToken: string) {
	try {
		const response = await fetch("https://graph.microsoft.com/v1.0/me", {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		})

		if (!response.ok) {
			throw new Error(`Failed to fetch user details: ${response.statusText}`)
		}

		return response.json()
	} catch (error) {
		console.error("Error getting user details:", error)
		throw error
	}
}

// Create a client with user access token
export function createUserGraphClient(accessToken: string) {
	return Client.init({
		authProvider: (done) => {
			done(null, accessToken)
		},
	})
}

