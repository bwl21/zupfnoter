class DropboxPKCE {
    constructor(clientId, redirectUri) {
        this.clientId = clientId;
        this.redirectUri = redirectUri;

        // Prüfen, ob ein gespeicherter Code Verifier existiert
        this.codeVerifier = localStorage.getItem("dropbox_code_verifier") || this.generateCodeVerifier();

        // Speichern des Code Verifiers für spätere Verwendung
        localStorage.setItem("dropbox_code_verifier", this.codeVerifier);

    }

    generateCodeVerifier() {
        const array = new Uint8Array(32);
        window.crypto.getRandomValues(array);
        return btoa(String.fromCharCode(...array))
            .replace(/=/g, "")
            .replace(/\+/g, "-")
            .replace(/\//g, "_");
    }

    async generateCodeChallenge(verifier) {
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);
        const digest = await crypto.subtle.digest("SHA-256", data);
        return btoa(String.fromCharCode(...new Uint8Array(digest)))
            .replace(/=/g, "")
            .replace(/\+/g, "-")
            .replace(/\//g, "_");
    }

    async getAuthUrl() {
        const codeChallenge = await this.generateCodeChallenge(this.codeVerifier);

        return `https://www.dropbox.com/oauth2/authorize?response_type=code&client_id=`
            + `${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}`
            + `&code_challenge=${codeChallenge}&code_challenge_method=S256`
            + '&token_access_type=offline';
    }

    async exchangeCodeForTokens(authCode) {
        console.log("Using Code Verifier:", this.codeVerifier); // Debugging
        console.log("Auth Code (token exchange):", authCode);
        console.log("Redirect URI (Token Exchange):", this.redirectUri);
        console.log("Code Verifier (Token Exchange):", this.codeVerifier);
        const response = await fetch("https://api.dropboxapi.com/oauth2/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code: authCode,
                grant_type: "authorization_code",
                client_id: this.clientId,
                redirect_uri: this.redirectUri,
                code_verifier: this.codeVerifier,
            }),
        });
        localStorage.removeItem('dropbox_code_verifier');
        if (!response.ok) {
            const errorDetails = await response.json();
            throw new Error(errorDetails.error_description || "Token exchange failed");
        }
        return await response.json();
    }

    async refreshToken(refreshToken) {
        console.log("Refreshing token with refresh_token:", refreshToken);
        const response = await fetch("https://api.dropboxapi.com/oauth2/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: refreshToken,
                client_id: this.clientId,
            }),
        });
        if (!response.ok) {
            const errorDetails = await response.json();
            throw new Error(errorDetails.error_description || "Token refresh failed");
        }
        return await response.json();
    }
}
