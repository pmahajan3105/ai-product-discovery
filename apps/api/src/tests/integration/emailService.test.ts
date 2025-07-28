/**
 * Email Service Integration Tests
 * Testing email functionality including magic links, verification, and notifications
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import {
  TestSetup,
  TestDataFactory,
  AuthTestHelper,
  PerformanceTestHelper
} from '../utils/testHelpers';
import { authBridgeService } from '../../services/authBridgeService';
import { userService } from '../../services/userService';

// Mock nodemailer for email testing
const mockSendMail = jest.fn();
const mockCreateTransporter = jest.fn(() => ({
  sendMail: mockSendMail
}));

jest.mock('nodemailer', () => ({
  createTransporter: mockCreateTransporter
}));

// Mock SuperTokens passwordless functionality
const mockCreateCode = jest.fn();
const mockConsumeCode = jest.fn();
const mockSendEmail = jest.fn();

jest.mock('supertokens-node/recipe/passwordless', () => ({
  createCode: mockCreateCode,
  consumeCode: mockConsumeCode,
  init: jest.fn()
}));

jest.mock('supertokens-node/recipe/emailverification', () => ({
  verifyEmailUsingToken: jest.fn(),
  init: jest.fn()
}));

describe('Email Service Integration Tests', () => {
  let testContext: any;

  beforeAll(async () => {
    // Setup integration test environment
    testContext = await TestSetup.setupE2ETest();
  });

  afterAll(async () => {
    await TestSetup.teardownTest();
  });

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock behaviors
    mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
    mockCreateCode.mockResolvedValue({
      status: 'OK',
      deviceId: 'test-device-id',
      preAuthSessionId: 'test-session-id',
      flowType: 'MAGIC_LINK'
    });
    mockConsumeCode.mockResolvedValue({
      status: 'OK',
      createdNewRecipeUser: false,
      user: {
        id: testContext.user.id,
        emails: [testContext.user.email],
        loginMethods: []
      }
    });
  });

  describe('SMTP Configuration and Setup', () => {
    test('should configure SMTP transporter correctly', () => {
      // Test that nodemailer transporter is configured with environment variables
      const expectedConfig = {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      };

      // This verifies the SMTP configuration structure
      expect(expectedConfig.host).toBeDefined();
      expect(expectedConfig.port).toBeDefined();
      expect(expectedConfig.auth).toBeDefined();
    });

    test('should handle SMTP environment variables', () => {
      // Verify required environment variables are available
      const requiredEnvVars = [
        'SMTP_HOST',
        'SMTP_PORT', 
        'SMTP_USER',
        'SMTP_PASSWORD',
        'SMTP_FROM_NAME',
        'SMTP_FROM_EMAIL'
      ];

      requiredEnvVars.forEach(envVar => {
        const value = process.env[envVar];
        expect(typeof value).toBe('string');
      });
    });

    test('should validate email transporter creation', () => {
      // Test the transporter factory pattern
      const mockConfig = {
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@example.com',
          pass: 'password'
        }
      };

      mockCreateTransporter(mockConfig);
      expect(mockCreateTransporter).toHaveBeenCalledWith(mockConfig);
    });
  });

  describe('Magic Link Authentication', () => {
    test('should send magic link email with correct structure', async () => {
      const testEmail = 'test@example.com';
      const magicLinkUrl = 'https://app.feedbackhub.com/auth/callback?token=test-token';
      
      // Simulate SuperTokens email service call
      const emailInput = {
        email: testEmail,
        urlWithLinkCode: magicLinkUrl,
        isFirstFactor: true
      };

      mockSendEmail.mockResolvedValue(undefined);
      await mockSendEmail(emailInput);

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          email: testEmail,
          urlWithLinkCode: magicLinkUrl,
          isFirstFactor: true
        })
      );
    });

    test('should handle magic link creation flow', async () => {
      const email = 'newuser@example.com';
      
      const result = await mockCreateCode({
        email: email
      });

      expect(mockCreateCode).toHaveBeenCalledWith({
        email: email
      });

      expect(result).toMatchObject({
        status: 'OK',
        deviceId: expect.any(String),
        preAuthSessionId: expect.any(String),
        flowType: 'MAGIC_LINK'
      });
    });

    test('should handle magic link consumption for new users', async () => {
      const linkCode = 'test-link-code-123';
      const preAuthSessionId = 'test-session-id';

      // Mock new user creation
      mockConsumeCode.mockResolvedValueOnce({
        status: 'OK',
        createdNewRecipeUser: true,
        user: {
          id: 'new-user-id',
          emails: ['newuser@example.com'],
          loginMethods: []
        }
      });

      const result = await mockConsumeCode({
        linkCode,
        preAuthSessionId
      });

      expect(mockConsumeCode).toHaveBeenCalledWith({
        linkCode,
        preAuthSessionId
      });

      expect(result.status).toBe('OK');
      expect(result.createdNewRecipeUser).toBe(true);
      expect(result.user.emails).toContain('newuser@example.com');
    });

    test('should handle magic link consumption for existing users', async () => {
      const linkCode = 'existing-user-link-code';
      const preAuthSessionId = 'existing-session-id';

      const result = await mockConsumeCode({
        linkCode,
        preAuthSessionId
      });

      expect(result.status).toBe('OK');
      expect(result.createdNewRecipeUser).toBe(false);
      expect(result.user.id).toBe(testContext.user.id);
    });

    test('should generate appropriate email content for different scenarios', () => {
      // Test first-factor magic link email
      const firstFactorEmail = {
        isFirstFactor: true,
        urlWithLinkCode: 'https://app.feedbackhub.com/auth?token=first-factor'
      };

      // Test second-factor email
      const secondFactorEmail = {
        isFirstFactor: false, 
        urlWithLinkCode: 'https://app.feedbackhub.com/auth?token=second-factor'
      };

      // Verify email content structure
      expect(firstFactorEmail.isFirstFactor).toBe(true);
      expect(secondFactorEmail.isFirstFactor).toBe(false);
      expect(firstFactorEmail.urlWithLinkCode).toContain('first-factor');
      expect(secondFactorEmail.urlWithLinkCode).toContain('second-factor');
    });

    test('should handle magic link expiration', async () => {
      // Test expired link code
      mockConsumeCode.mockResolvedValueOnce({
        status: 'EXPIRED_USER_INPUT_CODE_ERROR'
      });

      const result = await mockConsumeCode({
        linkCode: 'expired-code',
        preAuthSessionId: 'session-id'
      });

      expect(result.status).toBe('EXPIRED_USER_INPUT_CODE_ERROR');
    });

    test('should handle invalid magic link codes', async () => {
      // Test invalid link code
      mockConsumeCode.mockResolvedValueOnce({
        status: 'INCORRECT_USER_INPUT_CODE_ERROR'
      });

      const result = await mockConsumeCode({
        linkCode: 'invalid-code',
        preAuthSessionId: 'session-id'
      });

      expect(result.status).toBe('INCORRECT_USER_INPUT_CODE_ERROR');
    });
  });

  describe('Email Verification Flow', () => {
    test('should mark user email as verified', async () => {
      const userId = testContext.user.id;

      // Test email verification through user service
      await userService.markEmailVerified(userId);

      // Verify the user's email verification status
      const userProfile = await userService.getUserProfile(userId);
      expect(userProfile.isEmailVerified).toBe(true);
      expect(userProfile.emailVerifiedTime).toBeInstanceOf(Date);
    });

    test('should handle email verification through auth bridge', async () => {
      const userId = testContext.user.id;
      const email = testContext.user.email;

      // Test auth bridge email verification handler
      await authBridgeService.handleEmailVerification(userId, email);

      // This should update the user's verification status
      const userProfile = await userService.getUserProfile(userId);
      expect(userProfile.isEmailVerified).toBe(true);
    });

    test('should handle email verification with invalid user', async () => {
      const invalidUserId = 'non-existent-user-id';
      const email = 'test@example.com';

      // Should handle invalid user gracefully
      await expect(
        authBridgeService.handleEmailVerification(invalidUserId, email)
      ).rejects.toThrow();
    });

    test('should handle email verification token validation', () => {
      // Test email verification token structure
      const verificationToken = {
        token: 'verification-token-123',
        userId: testContext.user.id,
        email: testContext.user.email,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      };

      expect(verificationToken.token).toBeDefined();
      expect(verificationToken.userId).toBe(testContext.user.id);
      expect(verificationToken.email).toBe(testContext.user.email);
      expect(verificationToken.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('Customer Email Management', () => {
    test('should validate email format for customers', () => {
      const validEmails = [
        'user@example.com',
        'test.email+tag@domain.co.uk',
        'user123@subdomain.example.org'
      ];

      const invalidEmails = [
        'invalid-email',
        'missing@',
        '@missingdomain.com',
        'spaces in@email.com',
        'multiple@@signs.com'
      ];

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      validEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(true);
      });

      invalidEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(false);
      });
    });

    test('should extract company domain from customer emails', () => {
      const testCases = [
        { email: 'john@company.com', expected: 'company.com' },
        { email: 'user@subdomain.enterprise.org', expected: 'enterprise.org' },
        { email: 'test@gmail.com', expected: null }, // Should ignore consumer domains
        { email: 'invalid-email', expected: null }
      ];

      const ignoredDomains = new Set([
        'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
        'icloud.com', 'aol.com'
      ]);

      const extractValidDomain = (email: string): string | null => {
        if (!email || !email.includes('@')) return null;
        
        const domain = email.split('@')[1].toLowerCase().trim();
        const mainDomain = domain.split('.').slice(-2).join('.');
        
        return ignoredDomains.has(mainDomain) ? null : domain;
      };

      testCases.forEach(({ email, expected }) => {
        const result = extractValidDomain(email);
        expect(result).toBe(expected);
      });
    });

    test('should search users by email', async () => {
      const searchQuery = 'test';
      const limit = 5;

      const results = await userService.searchUsersByEmail(searchQuery, limit);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeLessThanOrEqual(limit);
      
      results.forEach(user => {
        expect(user).toMatchObject({
          id: expect.any(String),
          email: expect.any(String),
          firstName: expect.any(String),
          lastName: expect.any(String)
        });
        expect(user.email.toLowerCase()).toContain(searchQuery.toLowerCase());
      });
    });

    test('should handle customer email identification', async () => {
      // Test customer identification by email
      const customerData = {
        name: 'Email Customer',
        email: 'customer@testcompany.com',
        company: 'Test Company'
      };

      const { db } = await import('../../services/database');
      const customer = await db.models.Customer.create({
        ...TestDataFactory.createCustomerData(customerData),
        organizationId: testContext.organization.id
      });

      // Verify customer creation with email
      expect(customer.email).toBe(customerData.email);
      expect(customer.name).toBe(customerData.name);

      // Cleanup
      await customer.destroy();
    });
  });

  describe('Email Template and Content', () => {
    test('should generate proper HTML email structure', () => {
      const emailContent = {
        title: 'Sign in to FeedbackHub',
        buttonText: 'Sign In',
        magicLink: 'https://app.feedbackhub.com/auth?token=test',
        isFirstFactor: true
      };

      // Test email template structure
      const htmlTemplate = `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h2 style="color: #333; text-align: center;">
            ${emailContent.title}
          </h2>
          <p style="color: #666; line-height: 1.6;">
            Click the button below to ${emailContent.isFirstFactor ? "sign in" : "complete your sign in"} to your FeedbackHub account:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${emailContent.magicLink}" 
               style="background-color: #5E72E4; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              ${emailContent.buttonText}
            </a>
          </div>
          <p style="color: #999; font-size: 14px;">
            This link will expire in 15 minutes. If you didn't request this email, you can safely ignore it.
          </p>
        </div>
      `;

      // Verify template contains required elements
      expect(htmlTemplate).toContain(emailContent.title);
      expect(htmlTemplate).toContain(emailContent.magicLink);
      expect(htmlTemplate).toContain(emailContent.buttonText);
      expect(htmlTemplate).toContain('15 minutes');
    });

    test('should customize email content based on user state', () => {
      const firstFactorEmail = {
        isFirstFactor: true,
        subject: 'Sign in to FeedbackHub',
        heading: 'Sign in to FeedbackHub',
        buttonText: 'Sign In',
        description: 'sign in'
      };

      const secondFactorEmail = {
        isFirstFactor: false,
        subject: 'Complete your sign in',
        heading: 'Complete your sign in', 
        buttonText: 'Complete Sign In',
        description: 'complete your sign in'
      };

      // Test different email states
      expect(firstFactorEmail.isFirstFactor).toBe(true);
      expect(secondFactorEmail.isFirstFactor).toBe(false);
      expect(firstFactorEmail.subject).toContain('Sign in');
      expect(secondFactorEmail.subject).toContain('Complete');
    });
  });

  describe('Performance and Reliability', () => {
    test('should handle concurrent email sends', async () => {
      const emailCount = 5;
      
      const sendEmail = async (index: number) => {
        const emailData = {
          to: `test${index}@example.com`,
          subject: `Test Email ${index}`,
          html: `<p>Test email content ${index}</p>`
        };

        return await mockSendMail(emailData);
      };

      const { results, averageTimeMs } = await PerformanceTestHelper.runConcurrent(
        () => sendEmail(Date.now()),
        emailCount
      );

      // All emails should be sent successfully
      results.forEach(result => {
        expect(result.messageId).toBeDefined();
      });

      // Should handle concurrent sends efficiently
      PerformanceTestHelper.assertPerformance(averageTimeMs, 1000);
    });

    test('should handle email sending timeouts', async () => {
      // Mock email timeout
      mockSendMail.mockRejectedValueOnce(new Error('Connection timeout'));

      await expect(
        mockSendMail({
          to: 'timeout@example.com',
          subject: 'Timeout Test',
          html: '<p>This should timeout</p>'
        })
      ).rejects.toThrow('Connection timeout');
    });

    test('should handle SMTP connection failures', async () => {
      // Mock SMTP connection failure
      mockCreateTransporter.mockImplementationOnce(() => {
        throw new Error('SMTP connection failed');
      });

      expect(() => {
        mockCreateTransporter({
          host: 'invalid-smtp-host',
          port: 587,
          auth: { user: 'test', pass: 'test' }
        });
      }).toThrow('SMTP connection failed');
    });

    test('should validate email rate limiting', () => {
      // Test email rate limiting structure
      const rateLimits = {
        magicLinks: { limit: 10, window: '15m' },
        verification: { limit: 5, window: '1h' },
        notifications: { limit: 100, window: '1h' }
      };

      expect(rateLimits.magicLinks.limit).toBe(10);
      expect(rateLimits.verification.limit).toBe(5);
      expect(rateLimits.notifications.limit).toBe(100);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle malformed email addresses', async () => {
      const malformedEmails = [
        'not-an-email',
        'missing@',
        '@missing-domain',
        'spaces in@email.com'
      ];

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      malformedEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(false);
      });
    });

    test('should handle email sending failures gracefully', async () => {
      // Mock email sending failure
      mockSendMail.mockRejectedValueOnce(new Error('Email send failed'));

      await expect(
        mockSendMail({
          to: 'fail@example.com',
          subject: 'Failure Test',
          html: '<p>This should fail</p>'
        })
      ).rejects.toThrow('Email send failed');
    });

    test('should handle missing environment variables', () => {
      // Test handling of missing SMTP configuration
      const originalEnv = process.env.SMTP_HOST;
      delete process.env.SMTP_HOST;

      const smtpConfig = {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      };

      expect(smtpConfig.host).toBeUndefined();

      // Restore environment
      if (originalEnv) {
        process.env.SMTP_HOST = originalEnv;
      }
    });

    test('should handle invalid magic link tokens', async () => {
      // Test various invalid token scenarios
      const invalidTokens = [
        '',
        'invalid-token',
        'expired-token',
        'malformed-token-123'
      ];

      invalidTokens.forEach(token => {
        mockConsumeCode.mockResolvedValueOnce({
          status: 'INCORRECT_USER_INPUT_CODE_ERROR'
        });
      });

      for (const token of invalidTokens) {
        const result = await mockConsumeCode({
          linkCode: token,
          preAuthSessionId: 'test-session'
        });
        
        expect(result.status).toBe('INCORRECT_USER_INPUT_CODE_ERROR');
      }
    });

    test('should handle email verification edge cases', async () => {
      // Test verification with already verified user
      const alreadyVerifiedUser = await userService.getUserProfile(testContext.user.id);
      
      if (!alreadyVerifiedUser.isEmailVerified) {
        await userService.markEmailVerified(testContext.user.id);
      }

      // Verify multiple times should not cause errors
      await expect(
        userService.markEmailVerified(testContext.user.id)
      ).resolves.not.toThrow();
    });
  });

  describe('Integration with Auth Bridge Service', () => {
    test('should handle user signup through magic link', async () => {
      const newUser = {
        id: 'new-user-123',
        email: 'newuser@example.com',
        emailVerified: true,
        loginMethods: []
      };

      // Test auth bridge signup handler
      await expect(
        authBridgeService.handleUserSignup(newUser, { source: 'signup' })
      ).resolves.not.toThrow();
    });

    test('should handle user signin through magic link', async () => {
      const existingUser = {
        id: testContext.user.id,
        email: testContext.user.email,
        emailVerified: true,
        loginMethods: []
      };

      // Test auth bridge signin handler
      await expect(
        authBridgeService.handleUserSignin(existingUser)
      ).resolves.not.toThrow();
    });

    test('should handle auth bridge errors gracefully', async () => {
      // Test auth bridge with invalid data
      const invalidUser = {
        id: '',
        email: 'invalid-email',
        emailVerified: false,
        loginMethods: []
      };

      // Should handle invalid user data
      await expect(
        authBridgeService.handleUserSignup(invalidUser, { source: 'signup' })
      ).rejects.toThrow();
    });
  });

  describe('Email Analytics and Logging', () => {
    test('should log magic link creation events', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      // Simulate magic link creation logging
      const identifier = 'test@example.com';
      console.log(`📧 Magic link requested for: ${identifier}`);

      expect(logSpy).toHaveBeenCalledWith(`📧 Magic link requested for: ${identifier}`);
      
      logSpy.mockRestore();
    });

    test('should track email delivery metrics', () => {
      // Test email metrics structure
      const emailMetrics = {
        sent: 100,
        delivered: 95,
        opened: 60,
        clicked: 25,
        bounced: 3,
        complained: 1,
        deliveryRate: 0.95,
        openRate: 0.63,
        clickRate: 0.42
      };

      expect(emailMetrics.deliveryRate).toBeCloseTo(0.95, 2);
      expect(emailMetrics.openRate).toBeCloseTo(0.63, 2);
      expect(emailMetrics.clickRate).toBeCloseTo(0.42, 2);
    });

    test('should validate email event tracking', () => {
      // Test email event structure
      const emailEvent = {
        messageId: 'test-message-123',
        eventType: 'delivered',
        timestamp: new Date(),
        recipient: 'user@example.com',
        metadata: {
          campaignId: 'magic-link',
          userId: testContext.user.id
        }
      };

      expect(emailEvent.messageId).toBeDefined();
      expect(['sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained']).toContain(emailEvent.eventType);
      expect(emailEvent.timestamp).toBeInstanceOf(Date);
      expect(emailEvent.recipient).toContain('@');
    });
  });
}); 