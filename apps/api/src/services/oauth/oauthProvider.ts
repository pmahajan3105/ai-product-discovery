/**
 * OAuth Provider Base Class
 * Abstract base class for OAuth2 providers based on Zeda patterns
 */

export interface OAuth2Credentials {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresAt?: Date;
  scope?: string;
  metadata?: Record<string, any>;
}

export interface OAuth2TokenPayload {
  grant_type: string;
  client_id: string;
  client_secret: string;
  code?: string;
  refresh_token?: string;
  redirect_uri?: string;
}

export interface OAuth2Config {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
}

export abstract class OAuth2Provider {
  protected config: OAuth2Config;

  constructor(config: OAuth2Config) {
    this.config = config;
  }

  /**
   * Generate authorization URL for OAuth flow
   */
  getAuthorizationUrl(state: string, additionalParams?: Record<string, string>): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      state,
      ...additionalParams
    });

    return `${this.config.authUrl}?${params.toString()}`;
  }

  /**
   * Build token exchange payload for authorization code
   */
  buildAuthConfig(authCode: string): OAuth2TokenPayload {
    return {
      grant_type: 'authorization_code',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code: authCode,
      redirect_uri: this.config.redirectUri
    };
  }

  /**
   * Build token refresh payload
   */
  buildRefreshConfig(credentials: OAuth2Credentials): OAuth2TokenPayload {
    if (!credentials.refreshToken) {
      throw new Error('Refresh token is required for token refresh');
    }

    return {
      grant_type: 'refresh_token',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: credentials.refreshToken
    };
  }

  /**
   * Get request headers for token requests
   */
  getRequestHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    };
  }

  /**
   * Parse raw token response from OAuth provider
   */
  parseTokenResponse(response: any): OAuth2Credentials {
    const expiresAt = response.expires_in 
      ? new Date(Date.now() + response.expires_in * 1000)
      : undefined;

    return {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      tokenType: response.token_type || 'Bearer',
      expiresAt,
      scope: response.scope,
      metadata: this.extractMetadata(response)
    };
  }

  /**
   * Extract provider-specific metadata from token response
   */
  protected extractMetadata(response: any): Record<string, any> {
    // Override in provider-specific implementations
    return {};
  }

  /**
   * Check if token is expired (with 5-minute buffer)
   */
  static isTokenExpired(expiresAt?: Date): boolean {
    if (!expiresAt) return false;
    
    const now = new Date();
    const expiry = new Date(expiresAt);
    const buffer = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    return expiry.getTime() - now.getTime() < buffer;
  }

  /**
   * Get authorization header for API requests
   */
  getAuthHeader(credentials: OAuth2Credentials): Record<string, string> {
    return {
      'Authorization': `${credentials.tokenType} ${credentials.accessToken}`
    };
  }

  /**
   * Abstract method for provider-specific token validation
   */
  abstract validateToken(credentials: OAuth2Credentials): Promise<boolean>;

  /**
   * Abstract method for provider-specific user info extraction
   */
  abstract getUserInfo(credentials: OAuth2Credentials): Promise<any>;
}