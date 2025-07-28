/**
 * Security Audit Script
 * Comprehensive security analysis for the FeedbackHub API
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

class SecurityAudit {
  constructor() {
    this.findings = [];
    this.apiUrl = process.env.API_BASE_URL || 'http://localhost:3001';
  }

  /**
   * Run comprehensive security audit
   */
  async runAudit() {
    console.log('🔒 Starting Security Audit...\n');

    try {
      // Run all security checks
      await this.auditEndpointSecurity();
      await this.auditInputValidation();
      await this.auditDependencies();
      await this.auditConfiguration();
      await this.auditAuthentication();
      await this.auditDataExposure();

      // Generate report
      this.generateReport();

    } catch (error) {
      console.error('❌ Security audit failed:', error.message);
    }
  }

  /**
   * Audit API endpoint security
   */
  async auditEndpointSecurity() {
    console.log('🛡️ Auditing Endpoint Security...');

    const securityTests = [
      {
        name: 'CORS Configuration',
        check: async () => {
          try {
            const response = await axios.options(`${this.apiUrl}/api/health`, {
              headers: { 'Origin': 'https://malicious-site.com' }
            });
            
            const corsHeader = response.headers['access-control-allow-origin'];
            
            if (corsHeader === '*') {
              return { 
                status: 'CRITICAL', 
                message: 'CORS allows all origins - security risk' 
              };
            } else if (corsHeader) {
              return { 
                status: 'GOOD', 
                message: `CORS properly configured: ${corsHeader}` 
              };
            } else {
              return { 
                status: 'WARNING', 
                message: 'CORS headers not present' 
              };
            }
          } catch (error) {
            return { 
              status: 'ERROR', 
              message: `CORS test failed: ${error.message}` 
            };
          }
        }
      },
      {
        name: 'HTTP Security Headers',
        check: async () => {
          try {
            const response = await axios.get(`${this.apiUrl}/api/health`);
            const headers = response.headers;

            const securityHeaders = {
              'x-content-type-options': 'nosniff',
              'x-frame-options': 'DENY',
              'x-xss-protection': '1; mode=block',
              'strict-transport-security': 'required for HTTPS'
            };

            const missing = [];
            const present = [];

            Object.entries(securityHeaders).forEach(([header, purpose]) => {
              if (headers[header]) {
                present.push(`${header}: ${headers[header]}`);
              } else {
                missing.push(`${header} (${purpose})`);
              }
            });

            if (missing.length > 0) {
              return {
                status: 'WARNING',
                message: `Missing security headers: ${missing.join(', ')}`,
                details: { missing, present }
              };
            } else {
              return {
                status: 'GOOD',
                message: 'All security headers present',
                details: { present }
              };
            }
          } catch (error) {
            return { 
              status: 'ERROR', 
              message: `Security headers test failed: ${error.message}` 
            };
          }
        }
      },
      {
        name: 'Rate Limiting',
        check: async () => {
          try {
            // Make multiple rapid requests to test rate limiting
            const requests = Array(10).fill().map(() => 
              axios.get(`${this.apiUrl}/api/health`).catch(err => err.response)
            );
            
            const responses = await Promise.all(requests);
            const rateLimited = responses.some(r => r && r.status === 429);

            if (rateLimited) {
              return {
                status: 'GOOD',
                message: 'Rate limiting is active'
              };
            } else {
              return {
                status: 'WARNING',
                message: 'Rate limiting not detected - may allow DoS attacks'
              };
            }
          } catch (error) {
            return { 
              status: 'ERROR', 
              message: `Rate limiting test failed: ${error.message}` 
            };
          }
        }
      },
      {
        name: 'Information Disclosure',
        check: async () => {
          try {
            const response = await axios.get(`${this.apiUrl}/api/health`);
            const serverHeader = response.headers['server'];
            const xPoweredBy = response.headers['x-powered-by'];

            const disclosures = [];
            if (serverHeader) disclosures.push(`Server: ${serverHeader}`);
            if (xPoweredBy) disclosures.push(`X-Powered-By: ${xPoweredBy}`);

            if (disclosures.length > 0) {
              return {
                status: 'WARNING',
                message: 'Information disclosure in headers',
                details: disclosures
              };
            } else {
              return {
                status: 'GOOD',
                message: 'No information disclosure detected'
              };
            }
          } catch (error) {
            return { 
              status: 'ERROR', 
              message: `Information disclosure test failed: ${error.message}` 
            };
          }
        }
      }
    ];

    for (const test of securityTests) {
      console.log(`  Testing: ${test.name}`);
      const result = await test.check();
      
      this.findings.push({
        category: 'Endpoint Security',
        test: test.name,
        ...result
      });

      const emoji = result.status === 'GOOD' ? '✅' : 
                   result.status === 'WARNING' ? '⚠️' : 
                   result.status === 'CRITICAL' ? '🚨' : '❌';
      
      console.log(`    ${emoji} ${result.message}`);
    }

    console.log('✅ Endpoint security audit complete\n');
  }

  /**
   * Audit input validation
   */
  async auditInputValidation() {
    console.log('🔍 Auditing Input Validation...');

    const validationTests = [
      {
        name: 'SQL Injection Protection',
        check: async () => {
          try {
            // Test with SQL injection payloads (safe test - won't actually inject)
            const maliciousPayloads = [
              "'; DROP TABLE users; --",
              "1' OR '1'='1",
              "admin'/*",
              "' UNION SELECT * FROM users --"
            ];

            let vulnerableEndpoints = [];

            // Test search endpoint with SQL injection
            for (const payload of maliciousPayloads) {
              try {
                const response = await axios.post(`${this.apiUrl}/api/search/test-org/natural`, {
                  query: payload
                }, { timeout: 5000 });

                // If request succeeds and returns data, might be vulnerable
                if (response.status === 200 && response.data) {
                  vulnerableEndpoints.push(`natural search with payload: ${payload}`);
                }
              } catch (error) {
                // Expected - validation should reject these
                if (error.response && error.response.status === 400) {
                  // Good - validation is working
                  continue;
                } else if (error.response && error.response.status === 500) {
                  // Possible SQL error - might be vulnerable
                  vulnerableEndpoints.push(`natural search error with: ${payload}`);
                }
              }
            }

            if (vulnerableEndpoints.length > 0) {
              return {
                status: 'CRITICAL',
                message: 'Possible SQL injection vulnerabilities detected',
                details: vulnerableEndpoints
              };
            } else {
              return {
                status: 'GOOD',
                message: 'SQL injection protection appears effective'
              };
            }
          } catch (error) {
            return { 
              status: 'ERROR', 
              message: `SQL injection test failed: ${error.message}` 
            };
          }
        }
      },
      {
        name: 'XSS Protection',
        check: async () => {
          try {
            const xssPayloads = [
              '<script>alert("xss")</script>',
              '"><script>alert("xss")</script>',
              'javascript:alert("xss")',
              '<img src=x onerror=alert("xss")>'
            ];

            let vulnerableFields = [];

            for (const payload of xssPayloads) {
              try {
                const response = await axios.post(`${this.apiUrl}/api/search/test-org/natural`, {
                  query: payload
                }, { timeout: 5000 });

                // Check if payload is reflected in response
                if (response.data && JSON.stringify(response.data).includes(payload)) {
                  vulnerableFields.push(`search query reflects: ${payload}`);
                }
              } catch (error) {
                // Expected - validation should handle these
                continue;
              }
            }

            if (vulnerableFields.length > 0) {
              return {
                status: 'CRITICAL',
                message: 'XSS vulnerabilities detected',
                details: vulnerableFields
              };
            } else {
              return {
                status: 'GOOD',
                message: 'XSS protection appears effective'
              };
            }
          } catch (error) {
            return { 
              status: 'ERROR', 
              message: `XSS test failed: ${error.message}` 
            };
          }
        }
      },
      {
        name: 'Input Size Limits',
        check: async () => {
          try {
            // Test with oversized input
            const largePayload = 'A'.repeat(100000); // 100KB string

            try {
              const response = await axios.post(`${this.apiUrl}/api/search/test-org/natural`, {
                query: largePayload
              }, { timeout: 10000 });

              if (response.status === 200) {
                return {
                  status: 'WARNING',
                  message: 'Large input accepted - may allow DoS attacks'
                };
              }
            } catch (error) {
              if (error.response && error.response.status === 413) {
                return {
                  status: 'GOOD',
                  message: 'Input size limits properly enforced'
                };
              } else if (error.response && error.response.status === 400) {
                return {
                  status: 'GOOD',
                  message: 'Input validation rejects oversized data'
                };
              }
            }

            return {
              status: 'WARNING',
              message: 'Input size limit behavior unclear'
            };
          } catch (error) {
            return { 
              status: 'ERROR', 
              message: `Input size test failed: ${error.message}` 
            };
          }
        }
      }
    ];

    for (const test of validationTests) {
      console.log(`  Testing: ${test.name}`);
      const result = await test.check();
      
      this.findings.push({
        category: 'Input Validation',
        test: test.name,
        ...result
      });

      const emoji = result.status === 'GOOD' ? '✅' : 
                   result.status === 'WARNING' ? '⚠️' : 
                   result.status === 'CRITICAL' ? '🚨' : '❌';
      
      console.log(`    ${emoji} ${result.message}`);
    }

    console.log('✅ Input validation audit complete\n');
  }

  /**
   * Audit dependencies for vulnerabilities
   */
  async auditDependencies() {
    console.log('📦 Auditing Dependencies...');

    try {
      // Check for package.json files
      const packageJsonPaths = [
        '/Users/prashantmahajan/dev/feedback-ai/feedback-hub/package.json',
        '/Users/prashantmahajan/dev/feedback-ai/feedback-hub/apps/api/package.json',
        '/Users/prashantmahajan/dev/feedback-ai/feedback-hub/apps/web/package.json'
      ];

      const vulnerabilities = [];
      const outdatedPackages = [];

      for (const packagePath of packageJsonPaths) {
        if (fs.existsSync(packagePath)) {
          const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
          const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

          // Check for known vulnerable packages (simplified check)
          const knownVulnerable = [
            'lodash@4.17.20', // Example - old version with known issues
            'minimist@1.2.5',
            'serialize-javascript@3.1.0'
          ];

          Object.entries(dependencies).forEach(([pkg, version]) => {
            const pkgVersion = `${pkg}@${version}`;
            if (knownVulnerable.some(vuln => pkgVersion.includes(vuln))) {
              vulnerabilities.push(`${pkg}@${version} in ${packagePath}`);
            }

            // Check for very old packages (simple heuristic)
            if (version.includes('^0.') || version.includes('~0.')) {
              outdatedPackages.push(`${pkg}@${version} (may be outdated)`);
            }
          });
        }
      }

      if (vulnerabilities.length > 0) {
        this.findings.push({
          category: 'Dependencies',
          test: 'Vulnerability Scan',
          status: 'CRITICAL',
          message: `${vulnerabilities.length} vulnerable dependencies found`,
          details: vulnerabilities
        });
      } else {
        this.findings.push({
          category: 'Dependencies',
          test: 'Vulnerability Scan',
          status: 'GOOD',
          message: 'No known vulnerable dependencies detected'
        });
      }

      if (outdatedPackages.length > 0) {
        this.findings.push({
          category: 'Dependencies',
          test: 'Package Freshness',
          status: 'WARNING',
          message: `${outdatedPackages.length} potentially outdated packages`,
          details: outdatedPackages.slice(0, 10) // Show first 10
        });
      } else {
        this.findings.push({
          category: 'Dependencies',
          test: 'Package Freshness',
          status: 'GOOD',
          message: 'Dependencies appear up to date'
        });
      }

      console.log('✅ Dependency audit complete\n');

    } catch (error) {
      console.error('❌ Dependency audit failed:', error.message);
      this.findings.push({
        category: 'Dependencies',
        test: 'Dependency Scan',
        status: 'ERROR',
        message: `Dependency audit failed: ${error.message}`
      });
    }
  }

  /**
   * Audit configuration security
   */
  async auditConfiguration() {
    console.log('⚙️ Auditing Configuration...');

    const configChecks = [
      {
        name: 'Environment Variables',
        check: () => {
          const sensitiveEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'API_KEY'];
          const exposedVars = [];
          const missingVars = [];

          sensitiveEnvVars.forEach(varName => {
            if (process.env[varName]) {
              // Check if it looks like a default/weak value
              const value = process.env[varName];
              if (value.includes('localhost') || value === 'secret' || value.length < 16) {
                exposedVars.push(`${varName} appears to use weak/default value`);
              }
            } else {
              missingVars.push(varName);
            }
          });

          if (exposedVars.length > 0) {
            return {
              status: 'CRITICAL',
              message: 'Weak/default values detected in environment variables',
              details: exposedVars
            };
          } else if (missingVars.length > 0) {
            return {
              status: 'WARNING',
              message: 'Some environment variables not set',
              details: missingVars
            };
          } else {
            return {
              status: 'GOOD',
              message: 'Environment variables appear properly configured'
            };
          }
        }
      },
      {
        name: 'File Permissions',
        check: () => {
          try {
            const sensitiveFiles = [
              '.env',
              '.env.local',
              'config/database.js',
              'config/secrets.json'
            ];

            const permissionIssues = [];

            sensitiveFiles.forEach(file => {
              const filePath = path.join(process.cwd(), file);
              if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                const mode = stats.mode & parseInt('777', 8);
                
                // Check if file is world-readable
                if (mode & parseInt('004', 8)) {
                  permissionIssues.push(`${file} is world-readable`);
                }
              }
            });

            if (permissionIssues.length > 0) {
              return {
                status: 'WARNING',
                message: 'File permission issues detected',
                details: permissionIssues
              };
            } else {
              return {
                status: 'GOOD',
                message: 'File permissions appear secure'
              };
            }
          } catch (error) {
            return {
              status: 'ERROR',
              message: `File permission check failed: ${error.message}`
            };
          }
        }
      }
    ];

    configChecks.forEach(check => {
      console.log(`  Checking: ${check.name}`);
      const result = check.check();
      
      this.findings.push({
        category: 'Configuration',
        test: check.name,
        ...result
      });

      const emoji = result.status === 'GOOD' ? '✅' : 
                   result.status === 'WARNING' ? '⚠️' : 
                   result.status === 'CRITICAL' ? '🚨' : '❌';
      
      console.log(`    ${emoji} ${result.message}`);
    });

    console.log('✅ Configuration audit complete\n');
  }

  /**
   * Audit authentication security
   */
  async auditAuthentication() {
    console.log('🔐 Auditing Authentication...');

    const authTests = [
      {
        name: 'Unauthenticated Access',
        check: async () => {
          try {
            // Test protected endpoints without authentication
            const protectedEndpoints = [
              '/api/organizations/test-org/feedback',
              '/api/search/test-org/natural',
              '/api/feedback/test-feedback-id'
            ];

            let unprotectedEndpoints = [];

            for (const endpoint of protectedEndpoints) {
              try {
                const response = await axios.get(`${this.apiUrl}${endpoint}`);
                if (response.status === 200) {
                  unprotectedEndpoints.push(endpoint);
                }
              } catch (error) {
                if (error.response && error.response.status === 401) {
                  // Good - endpoint is protected
                  continue;
                } else if (error.response && error.response.status === 404) {
                  // Endpoint might not exist, which is fine
                  continue;
                }
              }
            }

            if (unprotectedEndpoints.length > 0) {
              return {
                status: 'CRITICAL',
                message: 'Unprotected endpoints detected',
                details: unprotectedEndpoints
              };
            } else {
              return {
                status: 'GOOD',
                message: 'All tested endpoints properly protected'
              };
            }
          } catch (error) {
            return { 
              status: 'ERROR', 
              message: `Authentication test failed: ${error.message}` 
            };
          }
        }
      },
      {
        name: 'Session Security',
        check: async () => {
          try {
            // Test for session fixation and security
            const response = await axios.get(`${this.apiUrl}/api/health`);
            const setCookieHeader = response.headers['set-cookie'];

            if (setCookieHeader) {
              const cookieAnalysis = {
                httpOnly: false,
                secure: false,
                sameSite: false
              };

              setCookieHeader.forEach(cookie => {
                if (cookie.includes('HttpOnly')) cookieAnalysis.httpOnly = true;
                if (cookie.includes('Secure')) cookieAnalysis.secure = true;
                if (cookie.includes('SameSite')) cookieAnalysis.sameSite = true;
              });

              const issues = [];
              if (!cookieAnalysis.httpOnly) issues.push('Missing HttpOnly flag');
              if (!cookieAnalysis.secure) issues.push('Missing Secure flag');
              if (!cookieAnalysis.sameSite) issues.push('Missing SameSite protection');

              if (issues.length > 0) {
                return {
                  status: 'WARNING',
                  message: 'Session cookie security issues',
                  details: issues
                };
              } else {
                return {
                  status: 'GOOD',
                  message: 'Session cookies properly secured'
                };
              }
            } else {
              return {
                status: 'INFO',
                message: 'No session cookies detected in test'
              };
            }
          } catch (error) {
            return { 
              status: 'ERROR', 
              message: `Session security test failed: ${error.message}` 
            };
          }
        }
      }
    ];

    for (const test of authTests) {
      console.log(`  Testing: ${test.name}`);
      const result = await test.check();
      
      this.findings.push({
        category: 'Authentication',
        test: test.name,
        ...result
      });

      const emoji = result.status === 'GOOD' ? '✅' : 
                   result.status === 'WARNING' ? '⚠️' : 
                   result.status === 'CRITICAL' ? '🚨' : 
                   result.status === 'INFO' ? 'ℹ️' : '❌';
      
      console.log(`    ${emoji} ${result.message}`);
    }

    console.log('✅ Authentication audit complete\n');
  }

  /**
   * Audit for data exposure risks
   */
  async auditDataExposure() {
    console.log('🔍 Auditing Data Exposure...');

    const exposureTests = [
      {
        name: 'Error Message Information Disclosure',
        check: async () => {
          try {
            // Test with malformed requests to see error responses
            const testRequests = [
              { method: 'POST', url: '/api/search/invalid-uuid/natural', data: { query: 'test' } },
              { method: 'GET', url: '/api/organizations/invalid-uuid/feedback' },
              { method: 'POST', url: '/api/search/test-org/natural', data: { invalid: 'data' } }
            ];

            let exposureRisks = [];

            for (const request of testRequests) {
              try {
                await axios({
                  method: request.method,
                  url: `${this.apiUrl}${request.url}`,
                  data: request.data
                });
              } catch (error) {
                if (error.response && error.response.data) {
                  const errorData = JSON.stringify(error.response.data);
                  
                  // Check for sensitive information in error messages
                  const sensitivePatterns = [
                    /database.*error/i,
                    /stack trace/i,
                    /file.*path/i,
                    /connection.*string/i,
                    /sql.*query/i
                  ];

                  sensitivePatterns.forEach(pattern => {
                    if (pattern.test(errorData)) {
                      exposureRisks.push(`${request.url}: Error message may expose sensitive information`);
                    }
                  });
                }
              }
            }

            if (exposureRisks.length > 0) {
              return {
                status: 'WARNING',
                message: 'Potential information disclosure in error messages',
                details: exposureRisks
              };
            } else {
              return {
                status: 'GOOD',
                message: 'Error messages appear safe'
              };
            }
          } catch (error) {
            return { 
              status: 'ERROR', 
              message: `Data exposure test failed: ${error.message}` 
            };
          }
        }
      }
    ];

    for (const test of exposureTests) {
      console.log(`  Testing: ${test.name}`);
      const result = await test.check();
      
      this.findings.push({
        category: 'Data Exposure',
        test: test.name,
        ...result
      });

      const emoji = result.status === 'GOOD' ? '✅' : 
                   result.status === 'WARNING' ? '⚠️' : 
                   result.status === 'CRITICAL' ? '🚨' : '❌';
      
      console.log(`    ${emoji} ${result.message}`);
    }

    console.log('✅ Data exposure audit complete\n');
  }

  /**
   * Generate comprehensive security report
   */
  generateReport() {
    console.log('📊 SECURITY AUDIT REPORT');
    console.log('=' .repeat(60));

    const critical = this.findings.filter(f => f.status === 'CRITICAL');
    const warnings = this.findings.filter(f => f.status === 'WARNING');
    const good = this.findings.filter(f => f.status === 'GOOD');
    const errors = this.findings.filter(f => f.status === 'ERROR');

    console.log(`\n🚨 SUMMARY:`);
    console.log(`  Total Checks: ${this.findings.length}`);
    console.log(`  Critical Issues: ${critical.length}`);
    console.log(`  Warnings: ${warnings.length}`);
    console.log(`  Passed: ${good.length}`);
    console.log(`  Errors: ${errors.length}`);

    // Calculate security score
    const totalChecks = this.findings.length - errors.length;
    const passedChecks = good.length + (warnings.length * 0.5);
    const securityScore = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 0;

    console.log(`\n🎯 SECURITY SCORE: ${securityScore.toFixed(1)}%`);

    if (securityScore >= 90) {
      console.log('  Rating: EXCELLENT 🏆');
    } else if (securityScore >= 75) {
      console.log('  Rating: GOOD ✅');
    } else if (securityScore >= 60) {
      console.log('  Rating: FAIR ⚠️');
    } else {
      console.log('  Rating: NEEDS IMPROVEMENT 🚨');
    }

    // Critical issues
    if (critical.length > 0) {
      console.log(`\n🚨 CRITICAL ISSUES (${critical.length}):`);
      critical.forEach(finding => {
        console.log(`  - ${finding.category}: ${finding.test}`);
        console.log(`    ${finding.message}`);
        if (finding.details) {
          console.log(`    Details: ${Array.isArray(finding.details) ? finding.details.join(', ') : finding.details}`);
        }
        console.log('');
      });
    }

    // Warnings
    if (warnings.length > 0) {
      console.log(`\n⚠️ WARNINGS (${warnings.length}):`);
      warnings.forEach(finding => {
        console.log(`  - ${finding.category}: ${finding.test}`);
        console.log(`    ${finding.message}`);
        if (finding.details && finding.details.length <= 3) {
          console.log(`    Details: ${Array.isArray(finding.details) ? finding.details.join(', ') : finding.details}`);
        }
        console.log('');
      });
    }

    // Recommendations
    console.log(`\n💡 RECOMMENDATIONS:`);
    
    if (critical.length > 0) {
      console.log('  🔥 IMMEDIATE ACTION REQUIRED:');
      console.log('    - Address all critical security issues before production deployment');
      console.log('    - Review and harden authentication mechanisms');
      console.log('    - Implement proper input validation and sanitization');
    }

    if (warnings.length > 0) {
      console.log('  📋 SUGGESTED IMPROVEMENTS:');
      console.log('    - Implement missing security headers');
      console.log('    - Review and update dependency versions');
      console.log('    - Enhance error handling to prevent information disclosure');
      console.log('    - Implement comprehensive rate limiting');
    }

    console.log('  🛡️ GENERAL SECURITY BEST PRACTICES:');
    console.log('    - Regular security audits and penetration testing');
    console.log('    - Implement automated dependency vulnerability scanning');
    console.log('    - Set up security monitoring and alerting');
    console.log('    - Regular security training for development team');
    console.log('    - Implement Web Application Firewall (WAF)');

    console.log('\n' + '='.repeat(60));
    console.log('🔒 Security audit complete!');
    console.log('📝 Review findings and implement recommendations before production deployment.');
  }
}

// Run audit if called directly
if (require.main === module) {
  const audit = new SecurityAudit();
  audit.runAudit().catch(console.error);
}

module.exports = SecurityAudit;