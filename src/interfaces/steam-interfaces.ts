interface SteamResponse {
    hash: string;
    errorMsg: string;
    successMsg: string;
}

// Use the base interface directly for specific responses
export type SteamAccountVerificationResponse = SteamResponse;
export type SteamEmailChangeResponse = SteamResponse;
export type SteamEmailConfirmationResponse = SteamResponse;