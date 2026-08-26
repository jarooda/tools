import { describe, it, expect } from 'vitest'
import {
  generateApacheConfig,
  generateNginxConfig,
  validateConfigOptions,
  type ConfigOptions,
} from '@/utils/configGenerator'

const defaults: ConfigOptions = {
  forceHttps: false,
  wwwCanonicalization: 'none',
  primaryDomain: '',
  customDomainRedirect: false,
  customDomainRedirectTarget: '',
  preservePath: false,
  compression: false,
  cachingEnabled: false,
  cachingDuration: 30,
  cachingUnit: 'days',
  directoryListing: false,
  errorPage404Enabled: false,
  errorPage404Path: '',
  errorPage500Enabled: false,
  errorPage500Path: '',
  corsEnabled: false,
  corsOrigin: '*',
  basicAuthEnabled: false,
  basicAuthRealm: '',
  basicAuthUserFilePath: '',
  spaFallback: false,
}

function opts(overrides: Partial<ConfigOptions>): ConfigOptions {
  return { ...defaults, ...overrides }
}

describe('validateConfigOptions', () => {
  it('returns no errors for an all-disabled default', () => {
    expect(validateConfigOptions(defaults)).toEqual({})
  })

  it('requires primaryDomain when wwwCanonicalization is enabled', () => {
    const errors = validateConfigOptions(opts({ wwwCanonicalization: 'add-www' }))
    expect(errors.primaryDomain).toBeDefined()
  })

  it('rejects a primaryDomain with a protocol', () => {
    const errors = validateConfigOptions(
      opts({ wwwCanonicalization: 'add-www', primaryDomain: 'https://example.com' }),
    )
    expect(errors.primaryDomain).toBeDefined()
  })

  it('accepts a valid primaryDomain', () => {
    const errors = validateConfigOptions(
      opts({ wwwCanonicalization: 'add-www', primaryDomain: 'example.com' }),
    )
    expect(errors.primaryDomain).toBeUndefined()
  })

  it('requires customDomainRedirectTarget when customDomainRedirect is on', () => {
    const errors = validateConfigOptions(opts({ customDomainRedirect: true }))
    expect(errors.customDomainRedirectTarget).toBeDefined()
  })

  it('requires a positive cachingDuration when cachingEnabled', () => {
    expect(
      validateConfigOptions(opts({ cachingEnabled: true, cachingDuration: 0 })).cachingDuration,
    ).toBeDefined()
    expect(
      validateConfigOptions(opts({ cachingEnabled: true, cachingDuration: -5 })).cachingDuration,
    ).toBeDefined()
    expect(
      validateConfigOptions(opts({ cachingEnabled: true, cachingDuration: 30 })).cachingDuration,
    ).toBeUndefined()
  })

  it('requires error page paths when their toggle is on', () => {
    expect(
      validateConfigOptions(opts({ errorPage404Enabled: true, errorPage404Path: '' }))
        .errorPage404Path,
    ).toBeDefined()
    expect(
      validateConfigOptions(opts({ errorPage500Enabled: true, errorPage500Path: '' }))
        .errorPage500Path,
    ).toBeDefined()
  })

  it('requires a non-empty corsOrigin when corsEnabled', () => {
    expect(
      validateConfigOptions(opts({ corsEnabled: true, corsOrigin: '' })).corsOrigin,
    ).toBeDefined()
  })

  it('requires realm and user file path when basicAuthEnabled', () => {
    const errors = validateConfigOptions(opts({ basicAuthEnabled: true }))
    expect(errors.basicAuthRealm).toBeDefined()
    expect(errors.basicAuthUserFilePath).toBeDefined()
  })
})

describe('generateApacheConfig', () => {
  it('returns empty string when nothing is enabled', () => {
    expect(generateApacheConfig(defaults)).toBe('')
  })

  it('emits force HTTPS inside a mod_rewrite block', () => {
    const out = generateApacheConfig(opts({ forceHttps: true }))
    expect(out).toContain('<IfModule mod_rewrite.c>')
    expect(out).toContain('RewriteEngine On')
    expect(out).toContain('RewriteCond %{HTTPS} off')
    expect(out).toContain('RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]')
  })

  it('emits www canonicalization (remove-www) using primaryDomain', () => {
    const out = generateApacheConfig(
      opts({ wwwCanonicalization: 'remove-www', primaryDomain: 'example.com' }),
    )
    expect(out).toContain('RewriteCond %{HTTP_HOST} ^www\\.example\\.com$ [NC]')
    expect(out).toContain('RewriteRule ^(.*)$ https://example.com/$1 [L,R=301]')
  })

  it('emits www canonicalization (add-www) using primaryDomain', () => {
    const out = generateApacheConfig(
      opts({ wwwCanonicalization: 'add-www', primaryDomain: 'example.com' }),
    )
    expect(out).toContain('RewriteCond %{HTTP_HOST} !^www\\.example\\.com$ [NC]')
    expect(out).toContain('RewriteRule ^(.*)$ https://www.example.com/$1 [L,R=301]')
  })

  it('emits a custom domain redirect, preserving path when asked', () => {
    const preserved = generateApacheConfig(
      opts({
        customDomainRedirect: true,
        customDomainRedirectTarget: 'new.com',
        preservePath: true,
      }),
    )
    expect(preserved).toContain('RewriteRule ^(.*)$ https://new.com/$1 [R=301,L]')

    const notPreserved = generateApacheConfig(
      opts({
        customDomainRedirect: true,
        customDomainRedirectTarget: 'new.com',
        preservePath: false,
      }),
    )
    expect(notPreserved).toContain('RewriteRule ^(.*)$ https://new.com/ [R=301,L]')
  })

  it('emits compression via AddOutputFilterByType', () => {
    const out = generateApacheConfig(opts({ compression: true }))
    expect(out).toContain(
      'AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json image/svg+xml',
    )
  })

  it('emits browser caching with the requested duration and unit', () => {
    const out = generateApacheConfig(
      opts({ cachingEnabled: true, cachingDuration: 7, cachingUnit: 'days' }),
    )
    expect(out).toContain('<IfModule mod_expires.c>')
    expect(out).toContain('ExpiresByType image/jpeg "access plus 7 days"')
    expect(out).toContain('ExpiresByType font/woff2 "access plus 7 days"')
  })

  it('emits nothing for directory listing by default, and Options +Indexes when allowed', () => {
    expect(generateApacheConfig(opts({ compression: true }))).not.toContain('Options')
    expect(generateApacheConfig(opts({ directoryListing: true }))).toContain('Options +Indexes')
  })

  it('emits custom error pages per enabled code', () => {
    const out = generateApacheConfig(
      opts({
        errorPage404Enabled: true,
        errorPage404Path: '/404.html',
        errorPage500Enabled: true,
        errorPage500Path: '/500.html',
      }),
    )
    expect(out).toContain('ErrorDocument 404 /404.html')
    expect(out).toContain('ErrorDocument 500 /500.html')
  })

  it('emits CORS header', () => {
    const out = generateApacheConfig(opts({ corsEnabled: true, corsOrigin: 'https://example.com' }))
    expect(out).toContain('Header set Access-Control-Allow-Origin "https://example.com"')
  })

  it('emits basic auth directives with a leading htpasswd comment', () => {
    const out = generateApacheConfig(
      opts({
        basicAuthEnabled: true,
        basicAuthRealm: 'Restricted',
        basicAuthUserFilePath: '/etc/.htpasswd',
      }),
    )
    expect(out).toContain('# htpasswd -c /etc/.htpasswd yourusername')
    expect(out).toContain('AuthType Basic')
    expect(out).toContain('AuthName "Restricted"')
    expect(out).toContain('AuthUserFile /etc/.htpasswd')
    expect(out).toContain('Require valid-user')
  })

  it('emits SPA fallback inside the mod_rewrite block', () => {
    const out = generateApacheConfig(opts({ spaFallback: true }))
    expect(out).toContain('<IfModule mod_rewrite.c>')
    expect(out).toContain('RewriteRule . /index.html [L]')
  })

  it('dedups RewriteEngine On when multiple rewrite features are combined', () => {
    const out = generateApacheConfig(
      opts({
        forceHttps: true,
        wwwCanonicalization: 'remove-www',
        primaryDomain: 'example.com',
        spaFallback: true,
      }),
    )
    const occurrences = out.match(/RewriteEngine On/g) ?? []
    expect(occurrences).toHaveLength(1)
    const ifModuleBlocks = out.match(/<IfModule mod_rewrite\.c>/g) ?? []
    expect(ifModuleBlocks).toHaveLength(1)
    expect(out).toContain('RewriteCond %{HTTPS} off')
    expect(out).toContain('RewriteCond %{HTTP_HOST} ^www\\.example\\.com$ [NC]')
    expect(out).toContain('RewriteRule . /index.html [L]')
  })

  it('excludes invalid-but-enabled fields while still rendering other valid enabled features', () => {
    const out = generateApacheConfig(
      opts({
        wwwCanonicalization: 'add-www',
        primaryDomain: '',
        compression: true,
      }),
    )
    expect(out).not.toContain('WWW canonicalization')
    expect(out).toContain('AddOutputFilterByType DEFLATE')
  })
})

describe('generateNginxConfig', () => {
  it('returns empty string when nothing is enabled', () => {
    expect(generateNginxConfig(defaults)).toBe('')
  })

  it('emits a separate listen-80 server block for force HTTPS', () => {
    const out = generateNginxConfig(opts({ forceHttps: true }))
    expect(out).toContain('listen 80;')
    expect(out).toContain('return 301 https://$host$request_uri;')
  })

  it('emits www canonicalization if statements', () => {
    const removeWww = generateNginxConfig(
      opts({ wwwCanonicalization: 'remove-www', primaryDomain: 'example.com' }),
    )
    expect(removeWww).toContain("if ($host = 'www.example.com') {")
    expect(removeWww).toContain('return 301 $scheme://example.com$request_uri;')

    const addWww = generateNginxConfig(
      opts({ wwwCanonicalization: 'add-www', primaryDomain: 'example.com' }),
    )
    expect(addWww).toContain("if ($host = 'example.com') {")
    expect(addWww).toContain('return 301 $scheme://www.example.com$request_uri;')
  })

  it('emits a custom domain redirect, preserving path when asked', () => {
    const preserved = generateNginxConfig(
      opts({
        customDomainRedirect: true,
        customDomainRedirectTarget: 'new.com',
        preservePath: true,
      }),
    )
    expect(preserved).toContain('return 301 https://new.com$request_uri;')

    const notPreserved = generateNginxConfig(
      opts({
        customDomainRedirect: true,
        customDomainRedirectTarget: 'new.com',
        preservePath: false,
      }),
    )
    expect(notPreserved).toContain('return 301 https://new.com/;')
  })

  it('emits gzip and brotli directives with a module comment', () => {
    const out = generateNginxConfig(opts({ compression: true }))
    expect(out).toContain('gzip on;')
    expect(out).toContain(
      'gzip_types text/css application/javascript application/json image/svg+xml;',
    )
    expect(out).toContain('brotli on;')
    expect(out).toContain('ngx_brotli module')
  })

  it('emits browser caching with the requested duration and unit letter', () => {
    const out = generateNginxConfig(
      opts({ cachingEnabled: true, cachingDuration: 12, cachingUnit: 'hours' }),
    )
    expect(out).toContain('expires 12h;')
    expect(out).toContain('add_header Cache-Control "public, immutable";')
  })

  it('emits nothing for directory listing by default, and autoindex on when allowed', () => {
    expect(generateNginxConfig(opts({ compression: true }))).not.toContain('autoindex')
    expect(generateNginxConfig(opts({ compression: true, directoryListing: true }))).toContain(
      'autoindex on;',
    )
  })

  it('emits custom error pages, grouping 5xx codes under the 500 path', () => {
    const out = generateNginxConfig(
      opts({
        errorPage404Enabled: true,
        errorPage404Path: '/404.html',
        errorPage500Enabled: true,
        errorPage500Path: '/500.html',
      }),
    )
    expect(out).toContain('error_page 404 /404.html;')
    expect(out).toContain('error_page 500 502 503 504 /500.html;')
  })

  it('emits CORS header', () => {
    const out = generateNginxConfig(opts({ corsEnabled: true, corsOrigin: 'https://example.com' }))
    expect(out).toContain("add_header 'Access-Control-Allow-Origin' 'https://example.com' always;")
  })

  it('emits basic auth directives with a leading htpasswd comment', () => {
    const out = generateNginxConfig(
      opts({
        basicAuthEnabled: true,
        basicAuthRealm: 'Restricted',
        basicAuthUserFilePath: '/etc/.htpasswd',
      }),
    )
    expect(out).toContain('# htpasswd -c /etc/.htpasswd yourusername')
    expect(out).toContain('auth_basic "Restricted";')
    expect(out).toContain('auth_basic_user_file /etc/.htpasswd;')
  })

  it('emits SPA fallback location block', () => {
    const out = generateNginxConfig(opts({ spaFallback: true }))
    expect(out).toContain('location / {')
    expect(out).toContain('try_files $uri $uri/ /index.html;')
  })

  it('excludes invalid-but-enabled fields while still rendering other valid enabled features', () => {
    const out = generateNginxConfig(
      opts({
        customDomainRedirect: true,
        customDomainRedirectTarget: '',
        compression: true,
      }),
    )
    expect(out).not.toContain('Redirect to custom domain')
    expect(out).toContain('gzip on;')
  })
})
