/**
 * .htaccess / nginx config generator — pure, DOM-free string templating
 * (unit-tested in `test/`). Hand-rolled, no template-engine dependency.
 *
 * Apache rewrite-based features (Force HTTPS, WWW canonicalization, custom
 * domain redirect, SPA fallback) must not each open their own
 * `RewriteEngine On` — mod_rewrite only needs it once. `generateApacheConfig`
 * collects every enabled rewrite feature's comment + rules, in section
 * order, into one shared `<IfModule mod_rewrite.c>` block at the position of
 * the first rewrite feature encountered; later rewrite features fold into
 * that same block instead of emitting their own.
 */

export interface ConfigOptions {
  forceHttps: boolean
  wwwCanonicalization: 'none' | 'add-www' | 'remove-www'
  /** Shared field: canonical/current domain, used by wwwCanonicalization and customDomainRedirect. */
  primaryDomain: string
  customDomainRedirect: boolean
  /** The NEW domain to redirect to (distinct from primaryDomain). */
  customDomainRedirectTarget: string
  preservePath: boolean
  compression: boolean
  cachingEnabled: boolean
  cachingDuration: number
  cachingUnit: 'seconds' | 'minutes' | 'hours' | 'days'
  /** Default false = deny/off = safer default. */
  directoryListing: boolean
  errorPage404Enabled: boolean
  errorPage404Path: string
  errorPage500Enabled: boolean
  errorPage500Path: string
  corsEnabled: boolean
  corsOrigin: string
  basicAuthEnabled: boolean
  basicAuthRealm: string
  basicAuthUserFilePath: string
  spaFallback: boolean
}

const DOMAIN_RE = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/i

/** Field-name -> error message, only for enabled+invalid fields. */
export function validateConfigOptions(options: ConfigOptions): Record<string, string> {
  const errors: Record<string, string> = {}

  const needsPrimaryDomain = options.wwwCanonicalization !== 'none' || options.customDomainRedirect
  if (needsPrimaryDomain) {
    if (!options.primaryDomain.trim()) {
      errors.primaryDomain = 'Primary domain is required.'
    } else if (!DOMAIN_RE.test(options.primaryDomain.trim())) {
      errors.primaryDomain = 'Enter a bare domain, e.g. example.com (no protocol or path).'
    }
  }

  if (options.customDomainRedirect) {
    if (!options.customDomainRedirectTarget.trim()) {
      errors.customDomainRedirectTarget = 'Target domain is required.'
    } else if (!DOMAIN_RE.test(options.customDomainRedirectTarget.trim())) {
      errors.customDomainRedirectTarget =
        'Enter a bare domain, e.g. example.com (no protocol or path).'
    }
  }

  if (options.cachingEnabled) {
    if (!Number.isFinite(options.cachingDuration) || options.cachingDuration <= 0) {
      errors.cachingDuration = 'Duration must be a positive number.'
    }
  }

  if (options.errorPage404Enabled && !options.errorPage404Path.trim()) {
    errors.errorPage404Path = '404 error page path is required.'
  }
  if (options.errorPage500Enabled && !options.errorPage500Path.trim()) {
    errors.errorPage500Path = '500 error page path is required.'
  }

  if (options.corsEnabled && !options.corsOrigin.trim()) {
    errors.corsOrigin = 'CORS origin is required.'
  }

  if (options.basicAuthEnabled) {
    if (!options.basicAuthRealm.trim()) errors.basicAuthRealm = 'Realm is required.'
    if (!options.basicAuthUserFilePath.trim()) {
      errors.basicAuthUserFilePath = 'Password file path is required.'
    }
  }

  return errors
}

const UNIT_LETTER: Record<ConfigOptions['cachingUnit'], string> = {
  seconds: 's',
  minutes: 'm',
  hours: 'h',
  days: 'd',
}

// ---- Apache rewrite-rule fragments (feed the shared RewriteEngine block) ----

function forceHttpsRewriteRules(): string[] {
  return ['RewriteCond %{HTTPS} off', 'RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]']
}

function wwwCanonicalizationRewriteRules(options: ConfigOptions): string[] {
  const domain = options.primaryDomain.trim()
  const escaped = domain.replace(/\./g, '\\.')
  return options.wwwCanonicalization === 'remove-www'
    ? [
        `RewriteCond %{HTTP_HOST} ^www\\.${escaped}$ [NC]`,
        `RewriteRule ^(.*)$ https://${domain}/$1 [L,R=301]`,
      ]
    : [
        `RewriteCond %{HTTP_HOST} !^www\\.${escaped}$ [NC]`,
        `RewriteRule ^(.*)$ https://www.${domain}/$1 [L,R=301]`,
      ]
}

function customDomainRedirectRewriteRules(options: ConfigOptions): string[] {
  const target = options.customDomainRedirectTarget.trim()
  return options.preservePath
    ? [`RewriteRule ^(.*)$ https://${target}/$1 [R=301,L]`]
    : [`RewriteRule ^(.*)$ https://${target}/ [R=301,L]`]
}

function spaFallbackRewriteRules(): string[] {
  return [
    'RewriteCond %{REQUEST_FILENAME} !-f',
    'RewriteCond %{REQUEST_FILENAME} !-d',
    'RewriteRule . /index.html [L]',
  ]
}

// ---- Nginx fragments ----

function forceHttpsNginx(): string {
  return [
    '# Force HTTPS',
    '# nginx needs its own listen-80 server block to redirect plain HTTP.',
    'server {',
    '    listen 80;',
    '    server_name _;',
    '    return 301 https://$host$request_uri;',
    '}',
  ].join('\n')
}

function wwwCanonicalizationNginx(options: ConfigOptions): string {
  const domain = options.primaryDomain.trim()
  const body =
    options.wwwCanonicalization === 'remove-www'
      ? [`if ($host = 'www.${domain}') {`, `    return 301 $scheme://${domain}$request_uri;`, '}']
      : [`if ($host = '${domain}') {`, `    return 301 $scheme://www.${domain}$request_uri;`, '}']
  return ['# WWW canonicalization', ...body].join('\n')
}

function customDomainRedirectNginx(options: ConfigOptions): string {
  const target = options.customDomainRedirectTarget.trim()
  const line = options.preservePath
    ? `return 301 https://${target}$request_uri;`
    : `return 301 https://${target}/;`
  return ['# Redirect to custom domain', line].join('\n')
}

function compressionApache(): string {
  return [
    '# Gzip/Brotli compression',
    'AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json image/svg+xml',
  ].join('\n')
}

function compressionNginx(): string {
  return [
    '# Gzip/Brotli compression',
    'gzip on;',
    'gzip_types text/css application/javascript application/json image/svg+xml;',
    '',
    '# brotli requires the ngx_brotli module to be compiled into nginx.',
    'brotli on;',
    'brotli_types text/css application/javascript application/json image/svg+xml;',
  ].join('\n')
}

function cachingApache(options: ConfigOptions): string {
  const n = options.cachingDuration
  const unit = options.cachingUnit
  const types = ['image/jpeg', 'image/png', 'text/css', 'application/javascript', 'font/woff2']
  return [
    '# Browser caching',
    '<IfModule mod_expires.c>',
    '    ExpiresActive On',
    ...types.map((t) => `    ExpiresByType ${t} "access plus ${n} ${unit}"`),
    '</IfModule>',
  ].join('\n')
}

function cachingNginx(options: ConfigOptions): string {
  const letter = UNIT_LETTER[options.cachingUnit]
  return [
    '# Browser caching',
    'location ~* \\.(jpg|jpeg|png|gif|css|js|woff2?)$ {',
    `    expires ${options.cachingDuration}${letter};`,
    '    add_header Cache-Control "public, immutable";',
    '}',
  ].join('\n')
}

function directoryListingApache(): string {
  return ['# Directory listing', 'Options +Indexes'].join('\n')
}

function directoryListingNginx(): string {
  return ['# Directory listing', 'autoindex on;'].join('\n')
}

function errorPagesApache(page404: boolean, page500: boolean, options: ConfigOptions): string {
  const lines = ['# Custom error pages']
  if (page404) lines.push(`ErrorDocument 404 ${options.errorPage404Path.trim()}`)
  if (page500) lines.push(`ErrorDocument 500 ${options.errorPage500Path.trim()}`)
  return lines.join('\n')
}

function errorPagesNginx(page404: boolean, page500: boolean, options: ConfigOptions): string {
  const lines = ['# Custom error pages']
  if (page404) lines.push(`error_page 404 ${options.errorPage404Path.trim()};`)
  if (page500) {
    lines.push('# Groups 500/502/503/504 under the one custom error page, an nginx idiom.')
    lines.push(`error_page 500 502 503 504 ${options.errorPage500Path.trim()};`)
  }
  return lines.join('\n')
}

function corsApache(options: ConfigOptions): string {
  return ['# CORS', `Header set Access-Control-Allow-Origin "${options.corsOrigin.trim()}"`].join(
    '\n',
  )
}

function corsNginx(options: ConfigOptions): string {
  return [
    '# CORS',
    `add_header 'Access-Control-Allow-Origin' '${options.corsOrigin.trim()}' always;`,
  ].join('\n')
}

function basicAuthApache(options: ConfigOptions): string {
  return [
    '# Basic auth',
    '# Generate the password file first, e.g.:',
    `# htpasswd -c ${options.basicAuthUserFilePath.trim()} yourusername`,
    'AuthType Basic',
    `AuthName "${options.basicAuthRealm.trim()}"`,
    `AuthUserFile ${options.basicAuthUserFilePath.trim()}`,
    'Require valid-user',
  ].join('\n')
}

function basicAuthNginx(options: ConfigOptions): string {
  return [
    '# Basic auth',
    '# Generate the password file first, e.g.:',
    `# htpasswd -c ${options.basicAuthUserFilePath.trim()} yourusername`,
    `auth_basic "${options.basicAuthRealm.trim()}";`,
    `auth_basic_user_file ${options.basicAuthUserFilePath.trim()};`,
  ].join('\n')
}

function spaFallbackNginx(): string {
  return ['# SPA fallback', 'location / {', '    try_files $uri $uri/ /index.html;', '}'].join('\n')
}

export function generateApacheConfig(options: ConfigOptions): string {
  const errors = validateConfigOptions(options)
  const pieces: (string | null)[] = []
  let rewriteSlot = -1
  const rewriteEntries: { comment: string; rules: string[] }[] = []

  function addRewriteFeature(comment: string, rules: string[]) {
    if (rewriteSlot === -1) {
      rewriteSlot = pieces.length
      pieces.push(null)
    }
    rewriteEntries.push({ comment, rules })
  }

  // Redirects
  if (options.forceHttps) addRewriteFeature('# Force HTTPS', forceHttpsRewriteRules())
  if (options.wwwCanonicalization !== 'none' && !errors.primaryDomain) {
    addRewriteFeature('# WWW canonicalization', wwwCanonicalizationRewriteRules(options))
  }
  if (options.customDomainRedirect && !errors.customDomainRedirectTarget) {
    addRewriteFeature('# Redirect to custom domain', customDomainRedirectRewriteRules(options))
  }

  // Performance
  if (options.compression) pieces.push(compressionApache())
  if (options.cachingEnabled && !errors.cachingDuration) pieces.push(cachingApache(options))

  // Security
  if (options.directoryListing) pieces.push(directoryListingApache())
  const page404 = options.errorPage404Enabled && !errors.errorPage404Path
  const page500 = options.errorPage500Enabled && !errors.errorPage500Path
  if (page404 || page500) pieces.push(errorPagesApache(page404, page500, options))
  if (options.corsEnabled && !errors.corsOrigin) pieces.push(corsApache(options))
  if (options.basicAuthEnabled && !errors.basicAuthRealm && !errors.basicAuthUserFilePath) {
    pieces.push(basicAuthApache(options))
  }

  // Routing
  if (options.spaFallback) addRewriteFeature('# SPA fallback', spaFallbackRewriteRules())

  if (rewriteSlot !== -1) {
    const body = rewriteEntries
      .map((e) => [e.comment, ...e.rules].map((l) => `    ${l}`).join('\n'))
      .join('\n\n')
    pieces[rewriteSlot] = [
      '<IfModule mod_rewrite.c>',
      '    RewriteEngine On',
      '',
      body,
      '</IfModule>',
    ].join('\n')
  }

  return pieces.filter((p): p is string => p !== null).join('\n\n')
}

export function generateNginxConfig(options: ConfigOptions): string {
  const errors = validateConfigOptions(options)
  const sections: string[] = []

  // Redirects
  if (options.forceHttps) sections.push(forceHttpsNginx())
  if (options.wwwCanonicalization !== 'none' && !errors.primaryDomain) {
    sections.push(wwwCanonicalizationNginx(options))
  }
  if (options.customDomainRedirect && !errors.customDomainRedirectTarget) {
    sections.push(customDomainRedirectNginx(options))
  }

  // Performance
  if (options.compression) sections.push(compressionNginx())
  if (options.cachingEnabled && !errors.cachingDuration) sections.push(cachingNginx(options))

  // Security
  if (options.directoryListing) sections.push(directoryListingNginx())
  const page404 = options.errorPage404Enabled && !errors.errorPage404Path
  const page500 = options.errorPage500Enabled && !errors.errorPage500Path
  if (page404 || page500) sections.push(errorPagesNginx(page404, page500, options))
  if (options.corsEnabled && !errors.corsOrigin) sections.push(corsNginx(options))
  if (options.basicAuthEnabled && !errors.basicAuthRealm && !errors.basicAuthUserFilePath) {
    sections.push(basicAuthNginx(options))
  }

  // Routing
  if (options.spaFallback) sections.push(spaFallbackNginx())

  return sections.join('\n\n')
}
