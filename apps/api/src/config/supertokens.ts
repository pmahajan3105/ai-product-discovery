import ThirdParty from "supertokens-node/recipe/thirdparty";
import Session from "supertokens-node/recipe/session";
import Dashboard from "supertokens-node/recipe/dashboard";
import Passwordless from "supertokens-node/recipe/passwordless";
import EmailVerification from "supertokens-node/recipe/emailverification";
import type { TypeInput } from "supertokens-node/types";
import { authBridgeService } from "../services/authBridgeService";

export function getApiDomain() {
  return process.env.API_DOMAIN || "http://localhost:3001";
}

export function getWebsiteDomain() {
  return process.env.WEBSITE_DOMAIN || "http://localhost:3000";
}

export const SuperTokensConfig: TypeInput = {
  supertokens: {
    connectionURI: process.env.SUPERTOKENS_CONNECTION_URI || "https://try.supertokens.com",
    apiKey: process.env.SUPERTOKENS_API_KEY,
  },
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
          {
            config: {
              thirdPartyId: "google",
              clients: [
                {
                  clientId: process.env.GOOGLE_CLIENT_ID || "",
                  clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
                },
              ],
            },
          }
        ],
      },
      override: {
        functions: (originalImplementation) => {
          return {
            ...originalImplementation,
            signInUp: async function (input) {
              const response = await originalImplementation.signInUp(input);
              
              if (response.status === "OK") {
                // Handle user signup/signin with database bridge
                const user = response.user;
                const isNewUser = response.createdNewRecipeUser;
                
                try {
                  if (isNewUser) {
                    // New user signup - create profile
                    await authBridgeService.handleUserSignup({
                      id: user.id,
                      email: user.emails[0],
                      emailVerified: user.loginMethods[0]?.verified || false,
                      loginMethods: user.loginMethods
                    }, {
                      source: 'oauth',
                      firstName: input.userContext?.firstName,
                      lastName: input.userContext?.lastName,
                      profileImage: input.userContext?.picture
                    });
                  } else {
                    // Existing user signin - update activity
                    await authBridgeService.handleUserSignin({
                      id: user.id,
                      email: user.emails[0],
                      emailVerified: user.loginMethods[0]?.verified || false,
                      loginMethods: user.loginMethods
                    });
                  }
                } catch (error) {
                  console.error('Auth bridge error in ThirdParty signInUp:', error);
                  // Don't fail the auth flow, just log the error
                }
              }
              
              return response;
            }
          };
        }
      }
    }),
    Passwordless.init({
      contactMethod: "EMAIL",
      flowType: "MAGIC_LINK",
      emailDelivery: {
        service: {
          sendEmail: async (input) => {
            // Use SMTP service to send magic link emails
            const nodemailer = require('nodemailer');
            
            const transporter = nodemailer.createTransporter({
              host: process.env.SMTP_HOST,
              port: process.env.SMTP_PORT,
              secure: false,
              auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD,
              },
            });

            await transporter.sendMail({
              from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
              to: input.email,
              subject: input.isFirstFactor ? "Sign in to FeedbackHub" : "Complete your sign in",
              html: `
                <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
                  <h2 style="color: #333; text-align: center;">
                    ${input.isFirstFactor ? "Sign in to FeedbackHub" : "Complete your sign in"}
                  </h2>
                  <p style="color: #666; line-height: 1.6;">
                    Click the button below to ${input.isFirstFactor ? "sign in" : "complete your sign in"} to your FeedbackHub account:
                  </p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${input.urlWithLinkCode}" 
                       style="background-color: #5E72E4; color: white; padding: 12px 24px; 
                              text-decoration: none; border-radius: 6px; display: inline-block;">
                      ${input.isFirstFactor ? "Sign In" : "Complete Sign In"}
                    </a>
                  </div>
                  <p style="color: #999; font-size: 14px;">
                    This link will expire in 15 minutes. If you didn't request this email, you can safely ignore it.
                  </p>
                </div>
              `,
            });
          },
        },
      },
      override: {
        functions: (originalImplementation) => {
          return {
            ...originalImplementation,
            createCode: async function (input) {
              const response = await originalImplementation.createCode(input);
              
              // Log magic link creation for analytics
              const identifier = 'email' in input ? input.email : input.phoneNumber;
              console.log(`📧 Magic link requested for: ${identifier}`);
              
              return response;
            },
            consumeCode: async function (input) {
              const response = await originalImplementation.consumeCode(input);
              
              if (response.status === "OK") {
                const user = response.user;
                const isNewUser = response.createdNewRecipeUser;
                
                try {
                  if (isNewUser) {
                    // New user signup via magic link
                    await authBridgeService.handleUserSignup({
                      id: user.id,
                      email: user.emails[0],
                      emailVerified: true, // Magic link confirms email
                      loginMethods: user.loginMethods
                    }, {
                      source: 'signup'
                    });
                  } else {
                    // Existing user signin
                    await authBridgeService.handleUserSignin({
                      id: user.id,
                      email: user.emails[0],
                      emailVerified: true,
                      loginMethods: user.loginMethods
                    });
                  }
                } catch (error) {
                  console.error('Auth bridge error in Passwordless consumeCode:', error);
                  // Don't fail the auth flow
                }
              }
              
              return response;
            }
          };
        }
      }
    }),
    EmailVerification.init({
      mode: "OPTIONAL",
      override: {
        functions: (originalImplementation) => {
          return {
            ...originalImplementation,
            verifyEmailUsingToken: async function (input) {
              const response = await originalImplementation.verifyEmailUsingToken(input);
              
              if (response.status === "OK") {
                try {
                  // Sync email verification with our database
                  await authBridgeService.handleEmailVerification(
                    response.user.recipeUserId.getAsString(),
                    response.user.email || ''
                  );
                } catch (error) {
                  console.error('Auth bridge error in email verification:', error);
                }
              }
              
              return response;
            }
          };
        }
      }
    }),
    Session.init({
      override: {
        functions: (originalImplementation) => {
          return {
            ...originalImplementation,
            createNewSession: async function (input) {
              const response = await originalImplementation.createNewSession(input);
              
              // Update user activity when new session is created
              try {
                await authBridgeService.handleUserSignin({
                  id: input.userId,
                  email: '', // We don't have email in session creation context
                  emailVerified: false
                });
              } catch (error) {
                console.error('Auth bridge error in session creation:', error);
              }
              
              return response;
            }
          };
        }
      }
    }),
    Dashboard.init({
      admins: process.env.NODE_ENV === 'development' ? ['admin@feedbackhub.com'] : [],
    }),
  ]
};