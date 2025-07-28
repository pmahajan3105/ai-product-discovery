import ThirdParty, { Google } from "supertokens-auth-react/recipe/thirdparty";
import { ThirdPartyPreBuiltUI } from "supertokens-auth-react/recipe/thirdparty/prebuiltui";
import Passwordless from "supertokens-auth-react/recipe/passwordless";
import { PasswordlessPreBuiltUI } from "supertokens-auth-react/recipe/passwordless/prebuiltui";
import Session from "supertokens-auth-react/recipe/session";

export function getApiDomain() {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
}

export function getWebsiteDomain() {
  return process.env.NEXT_PUBLIC_WEBSITE_URL || "http://localhost:3000";
}

export const SuperTokensConfig = {
  appInfo: {
    appName: "FeedbackHub",
    apiDomain: getApiDomain(),
    websiteDomain: getWebsiteDomain(),
    apiBasePath: "/auth",
    websiteBasePath: "/auth"
  },
  recipeList: [
    ThirdParty.init({
      signInAndUpFeature: {
        providers: [
          Google.init()
        ],
      },
    }),
    Passwordless.init({
      contactMethod: "EMAIL"
    }),
    Session.init()
  ],
  getRedirectionURL: async (context: {action: string; newSessionCreated: boolean}) => {
    if (context.action === "SUCCESS" && context.newSessionCreated) {
      return "/dashboard";
    }
  },
};

export const PreBuiltUIList = [ThirdPartyPreBuiltUI, PasswordlessPreBuiltUI];