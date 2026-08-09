export type HttpStatusClass = '1xx' | '2xx' | '3xx' | '4xx' | '5xx'

export interface HttpStatusEntry {
  code: number
  name: string
  class: HttpStatusClass
  /** One-line, always shown. */
  description: string
  /** Optional clarifying sentence for confusable codes. */
  note?: string
  /** Extra search terms not present in name/description. */
  keywords?: string[]
}

export const HTTP_STATUS_CLASS_LABEL: Record<HttpStatusClass, string> = {
  '1xx': 'Informational',
  '2xx': 'Success',
  '3xx': 'Redirection',
  '4xx': 'Client Error',
  '5xx': 'Server Error',
}

export const httpStatusEntries: HttpStatusEntry[] = [
  // 1xx — Informational
  {
    code: 100,
    name: 'Continue',
    class: '1xx',
    description: 'The initial part of a request has been received and the client should continue.',
  },
  {
    code: 101,
    name: 'Switching Protocols',
    class: '1xx',
    description: 'The server agrees to switch protocols, as requested by an Upgrade header.',
    keywords: ['websocket', 'upgrade'],
  },
  {
    code: 102,
    name: 'Processing',
    class: '1xx',
    description:
      'The server has received and is processing the request, but no response is available yet.',
    keywords: ['webdav'],
  },
  {
    code: 103,
    name: 'Early Hints',
    class: '1xx',
    description: 'Preliminary headers sent before the final response, e.g. to preload resources.',
    keywords: ['preload'],
  },

  // 2xx — Success
  {
    code: 200,
    name: 'OK',
    class: '2xx',
    description: 'The request succeeded and the response body contains the result.',
    note: 'Use 204 instead when the request succeeded but there is no body to return.',
  },
  {
    code: 201,
    name: 'Created',
    class: '2xx',
    description: 'The request succeeded and a new resource was created as a result.',
  },
  {
    code: 202,
    name: 'Accepted',
    class: '2xx',
    description: 'The request has been accepted for processing, but processing is not complete.',
  },
  {
    code: 203,
    name: 'Non-Authoritative Information',
    class: '2xx',
    description:
      'The returned metadata is from a local or third-party copy, not the origin server.',
  },
  {
    code: 204,
    name: 'No Content',
    class: '2xx',
    description: 'The request succeeded but there is no content to send in the response body.',
    note: 'Use 200 instead when a response body is present.',
  },
  {
    code: 205,
    name: 'Reset Content',
    class: '2xx',
    description:
      'The request succeeded; the client should reset the document view that sent the request.',
  },
  {
    code: 206,
    name: 'Partial Content',
    class: '2xx',
    description: 'Delivers only part of the resource, as requested by a Range header.',
    keywords: ['range', 'resume download'],
  },
  {
    code: 207,
    name: 'Multi-Status',
    class: '2xx',
    description: 'Conveys multiple status codes for independent operations in a single response.',
    keywords: ['webdav'],
  },
  {
    code: 208,
    name: 'Already Reported',
    class: '2xx',
    description: 'The members of a DAV binding have already been enumerated in a previous reply.',
    keywords: ['webdav'],
  },
  {
    code: 226,
    name: 'IM Used',
    class: '2xx',
    description:
      'The server fulfilled the request and the response is an instance-manipulation result.',
  },

  // 3xx — Redirection
  {
    code: 300,
    name: 'Multiple Choices',
    class: '3xx',
    description:
      'There are multiple possible representations of the resource for the client to choose from.',
  },
  {
    code: 301,
    name: 'Moved Permanently',
    class: '3xx',
    description: 'The resource has permanently moved to a new URL given by the Location header.',
    note: 'Permanent and may change the request method. Use 308 to keep the method fixed, or 302/307 for a temporary move.',
  },
  {
    code: 302,
    name: 'Found',
    class: '3xx',
    description:
      'The resource temporarily resides at a different URL; the original URL should be reused later.',
    note: 'Temporary and, historically, browsers may change the request method. Use 307 to guarantee the method is preserved.',
  },
  {
    code: 303,
    name: 'See Other',
    class: '3xx',
    description:
      'The response to the request can be found at another URL, fetched with a GET request.',
    keywords: ['post redirect get', 'prg'],
  },
  {
    code: 304,
    name: 'Not Modified',
    class: '3xx',
    description: 'The cached version of the resource is still valid; no body is returned.',
    keywords: ['cache', 'etag', 'conditional get'],
  },
  {
    code: 305,
    name: 'Use Proxy',
    class: '3xx',
    description:
      'The requested resource must be accessed through the proxy given by the Location header.',
    note: 'Deprecated due to security concerns; most clients ignore it.',
  },
  {
    code: 307,
    name: 'Temporary Redirect',
    class: '3xx',
    description:
      'The resource temporarily resides at a different URL; the request method must not change.',
    note: 'Temporary, unlike 301/308. Preserves the method, unlike 302 in older clients.',
  },
  {
    code: 308,
    name: 'Permanent Redirect',
    class: '3xx',
    description:
      'The resource has permanently moved to a new URL; the request method must not change.',
    note: 'Permanent, like 301, but guarantees the method is preserved.',
  },

  // 4xx — Client Error
  {
    code: 400,
    name: 'Bad Request',
    class: '4xx',
    description: 'The server cannot process the request due to malformed syntax or invalid data.',
    note: 'Use 422 instead when the syntax is valid but the semantics/validation fail.',
    keywords: ['malformed request'],
  },
  {
    code: 401,
    name: 'Unauthorized',
    class: '4xx',
    description: 'Authentication is required and has failed or not yet been provided.',
    note: 'Really means "unauthenticated" — the client is not logged in. Use 403 when the client is identified but lacks permission.',
    keywords: ['not logged in', 'authentication required'],
  },
  {
    code: 402,
    name: 'Payment Required',
    class: '4xx',
    description: 'Reserved for future use; occasionally used by APIs for payment/billing failures.',
  },
  {
    code: 403,
    name: 'Forbidden',
    class: '4xx',
    description: 'The client is authenticated but does not have permission to access the resource.',
    note: 'The client is known but not allowed. Use 401 when the client has not authenticated at all.',
    keywords: ['access denied', 'permission denied'],
  },
  {
    code: 404,
    name: 'Not Found',
    class: '4xx',
    description: 'The server cannot find the requested resource.',
    keywords: ['page not found', 'missing', '404'],
  },
  {
    code: 405,
    name: 'Method Not Allowed',
    class: '4xx',
    description: 'The request method is not supported for the requested resource.',
  },
  {
    code: 406,
    name: 'Not Acceptable',
    class: '4xx',
    description: 'No representation of the resource matches the criteria in the Accept headers.',
  },
  {
    code: 407,
    name: 'Proxy Authentication Required',
    class: '4xx',
    description: 'The client must first authenticate itself with a proxy.',
  },
  {
    code: 408,
    name: 'Request Timeout',
    class: '4xx',
    description: 'The server timed out waiting for the request from the client.',
  },
  {
    code: 409,
    name: 'Conflict',
    class: '4xx',
    description: 'The request conflicts with the current state of the target resource.',
    keywords: ['edit conflict', 'version conflict'],
  },
  {
    code: 410,
    name: 'Gone',
    class: '4xx',
    description: 'The resource is permanently gone and no forwarding address is known.',
  },
  {
    code: 411,
    name: 'Length Required',
    class: '4xx',
    description: 'The server refuses the request because a Content-Length header was not defined.',
  },
  {
    code: 412,
    name: 'Precondition Failed',
    class: '4xx',
    description: 'A condition in one of the request header fields evaluated to false.',
  },
  {
    code: 413,
    name: 'Content Too Large',
    class: '4xx',
    description: 'The request body is larger than the server is willing or able to process.',
    keywords: ['payload too large', 'request entity too large', 'file too big'],
  },
  {
    code: 414,
    name: 'URI Too Long',
    class: '4xx',
    description:
      'The URI requested by the client is longer than the server is willing to interpret.',
  },
  {
    code: 415,
    name: 'Unsupported Media Type',
    class: '4xx',
    description: 'The request body has a media format that the server does not support.',
  },
  {
    code: 416,
    name: 'Range Not Satisfiable',
    class: '4xx',
    description: 'The Range header value cannot be fulfilled for the target resource.',
  },
  {
    code: 417,
    name: 'Expectation Failed',
    class: '4xx',
    description: 'The expectation given in the request Expect header could not be met.',
  },
  {
    code: 418,
    name: "I'm a Teapot",
    class: '4xx',
    description:
      'A joke status code from the Hyper Text Coffee Pot Control Protocol; servers should not implement it.',
    note: "April Fools' Day RFC 2324 (1998); not a serious status code.",
    keywords: ['teapot', 'easter egg', 'rfc 2324', 'april fools'],
  },
  {
    code: 421,
    name: 'Misdirected Request',
    class: '4xx',
    description: 'The request was directed at a server that cannot produce a response for it.',
  },
  {
    code: 422,
    name: 'Unprocessable Content',
    class: '4xx',
    description: 'The request is well-formed but contains semantic errors that prevent processing.',
    note: 'Use 400 instead when the request body itself is malformed (not valid syntax).',
    keywords: ['unprocessable entity', 'validation error'],
  },
  {
    code: 423,
    name: 'Locked',
    class: '4xx',
    description: 'The resource being accessed is locked.',
    keywords: ['webdav'],
  },
  {
    code: 424,
    name: 'Failed Dependency',
    class: '4xx',
    description: 'The request failed because it depended on another request that failed.',
    keywords: ['webdav'],
  },
  {
    code: 425,
    name: 'Too Early',
    class: '4xx',
    description: 'The server is unwilling to risk processing a request that might be replayed.',
  },
  {
    code: 426,
    name: 'Upgrade Required',
    class: '4xx',
    description: 'The server refuses to perform the request using the current protocol.',
  },
  {
    code: 428,
    name: 'Precondition Required',
    class: '4xx',
    description:
      'The origin server requires the request to be conditional, e.g. to prevent lost updates.',
  },
  {
    code: 429,
    name: 'Too Many Requests',
    class: '4xx',
    description: 'The client has sent too many requests in a given amount of time.',
    note: 'Often paired with a Retry-After header telling the client how long to wait.',
    keywords: ['rate limit', 'rate limited', 'throttle', 'throttled'],
  },
  {
    code: 431,
    name: 'Request Header Fields Too Large',
    class: '4xx',
    description:
      'The server is unwilling to process the request because its header fields are too large.',
  },
  {
    code: 451,
    name: 'Unavailable For Legal Reasons',
    class: '4xx',
    description:
      'The resource is unavailable due to a legal demand, such as government censorship.',
    keywords: ['censorship', 'dmca'],
  },

  // 5xx — Server Error
  {
    code: 500,
    name: 'Internal Server Error',
    class: '5xx',
    description:
      'The server encountered an unexpected condition that prevented it from fulfilling the request.',
    keywords: ['server error', 'crash'],
  },
  {
    code: 501,
    name: 'Not Implemented',
    class: '5xx',
    description: 'The server does not support the functionality required to fulfill the request.',
  },
  {
    code: 502,
    name: 'Bad Gateway',
    class: '5xx',
    description:
      'The server, acting as a gateway, received an invalid response from an upstream server.',
    note: 'The gateway itself is fine, but the upstream response it received was invalid — different from 503, where the server (or upstream) is simply unavailable.',
    keywords: ['gateway'],
  },
  {
    code: 503,
    name: 'Service Unavailable',
    class: '5xx',
    description:
      'The server is temporarily unable to handle the request, often due to overload or maintenance.',
    note: 'Usually temporary; often paired with a Retry-After header. Different from 502, which reports a bad upstream response.',
    keywords: ['down', 'maintenance', 'overloaded'],
  },
  {
    code: 504,
    name: 'Gateway Timeout',
    class: '5xx',
    description:
      'The server, acting as a gateway, did not receive a timely response from an upstream server.',
    note: 'The gateway timed out waiting on an upstream server, unlike 502 (invalid response) or 503 (server unavailable).',
    keywords: ['gateway', 'timeout'],
  },
  {
    code: 505,
    name: 'HTTP Version Not Supported',
    class: '5xx',
    description: 'The server does not support the HTTP protocol version used in the request.',
  },
  {
    code: 506,
    name: 'Variant Also Negotiates',
    class: '5xx',
    description:
      'The server has an internal configuration error: the chosen variant resource is itself negotiable.',
  },
  {
    code: 507,
    name: 'Insufficient Storage',
    class: '5xx',
    description: 'The server is unable to store the representation needed to complete the request.',
    keywords: ['webdav'],
  },
  {
    code: 508,
    name: 'Loop Detected',
    class: '5xx',
    description: 'The server detected an infinite loop while processing the request.',
    keywords: ['webdav'],
  },
  {
    code: 510,
    name: 'Not Extended',
    class: '5xx',
    description: 'Further extensions to the request are required for the server to fulfill it.',
  },
  {
    code: 511,
    name: 'Network Authentication Required',
    class: '5xx',
    description:
      'The client needs to authenticate to gain network access, e.g. via a captive portal.',
    keywords: ['captive portal', 'wifi login'],
  },
]

function matchesSearch(entry: HttpStatusEntry, search: string): boolean {
  const q = search.trim().toLowerCase()
  if (q === '') return true
  if (String(entry.code).includes(q)) return true
  if (entry.name.toLowerCase().includes(q)) return true
  if (entry.description.toLowerCase().includes(q)) return true
  if (entry.note?.toLowerCase().includes(q)) return true
  if (entry.keywords?.some((k) => k.toLowerCase().includes(q))) return true
  return false
}

export function filterHttpStatusEntries(
  entries: HttpStatusEntry[],
  search: string,
  selectedClasses: HttpStatusClass[],
): HttpStatusEntry[] {
  return entries.filter(
    (entry) => selectedClasses.includes(entry.class) && matchesSearch(entry, search),
  )
}
