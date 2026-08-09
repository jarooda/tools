<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import OutputPanel from '@/components/tool/OutputPanel.vue'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { Select } from '@/components/ui/select'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Snippet } from '@/components/ui/snippet'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import {
  generateApacheConfig,
  generateNginxConfig,
  validateConfigOptions,
  type ConfigOptions,
} from '@/utils/configGenerator'
import { useDownload } from '@/composables/useDownload'

definePageMeta({ layout: 'tool' })

const tool = getTool('dev-config-generator')!

const { downloadText } = useDownload()

type ServerType = 'apache' | 'nginx'
const serverType = ref<ServerType>('apache')

const forceHttps = ref(false)

const wwwCanonEnabled = ref(false)
const wwwDirection = ref<'add-www' | 'remove-www'>('add-www')
const primaryDomain = ref('')

const customDomainRedirect = ref(false)
const customDomainRedirectTarget = ref('')
const preservePath = ref(false)

const compression = ref(false)

const cachingEnabled = ref(false)
const cachingDuration = ref<number | null>(30)
const cachingUnit = ref<ConfigOptions['cachingUnit']>('days')

const directoryListing = ref(false)

const errorPage404Enabled = ref(false)
const errorPage404Path = ref('/404.html')
const errorPage500Enabled = ref(false)
const errorPage500Path = ref('/500.html')

const corsEnabled = ref(false)
const corsOrigin = ref('*')

const basicAuthEnabled = ref(false)
const basicAuthRealm = ref('Restricted')
const basicAuthUserFilePath = ref('/etc/.htpasswd')

const spaFallback = ref(false)

const showPrimaryDomain = computed(() => wwwCanonEnabled.value || customDomainRedirect.value)

const wwwDirectionOptions = [
  { value: 'add-www', label: 'Add www (bare → www)' },
  { value: 'remove-www', label: 'Remove www (www → bare)' },
]

const cachingUnitOptions = [
  { value: 'seconds', label: 'Seconds' },
  { value: 'minutes', label: 'Minutes' },
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
]

const options = computed<ConfigOptions>(() => ({
  forceHttps: forceHttps.value,
  wwwCanonicalization: wwwCanonEnabled.value ? wwwDirection.value : 'none',
  primaryDomain: primaryDomain.value,
  customDomainRedirect: customDomainRedirect.value,
  customDomainRedirectTarget: customDomainRedirectTarget.value,
  preservePath: preservePath.value,
  compression: compression.value,
  cachingEnabled: cachingEnabled.value,
  cachingDuration: cachingDuration.value ?? 0,
  cachingUnit: cachingUnit.value,
  directoryListing: directoryListing.value,
  errorPage404Enabled: errorPage404Enabled.value,
  errorPage404Path: errorPage404Path.value,
  errorPage500Enabled: errorPage500Enabled.value,
  errorPage500Path: errorPage500Path.value,
  corsEnabled: corsEnabled.value,
  corsOrigin: corsOrigin.value,
  basicAuthEnabled: basicAuthEnabled.value,
  basicAuthRealm: basicAuthRealm.value,
  basicAuthUserFilePath: basicAuthUserFilePath.value,
  spaFallback: spaFallback.value,
}))

const errors = computed(() => validateConfigOptions(options.value))

const output = computed(() =>
  serverType.value === 'apache'
    ? generateApacheConfig(options.value)
    : generateNginxConfig(options.value),
)

const downloadName = computed(() => (serverType.value === 'apache' ? '.htaccess' : 'nginx.conf'))

const hasErrors = computed(() => Object.values(errors.value).some(Boolean))

const emptyDescription = computed(() =>
  output.value === '' && hasErrors.value
    ? 'Fix the highlighted fields to generate your config.'
    : 'Turn on a feature to generate your config.',
)

function download() {
  downloadText(output.value, downloadName.value, 'text/plain;charset=utf-8')
}
</script>

<template>
  <ToolPage :tool="tool">
    <div class="cfg">
      <SegmentedControl
        v-model="serverType"
        :options="[
          { value: 'apache', label: '.htaccess' },
          { value: 'nginx', label: 'nginx.conf' },
        ]"
      />

      <div class="cfg__grid">
        <div class="cfg__options">
          <Card elevation="flat">
            <CardHeader title="Redirects" />
            <CardBody class="cfg__card-body">
              <Switch
                v-model="forceHttps"
                label="Force HTTPS"
                description="Redirect all HTTP requests to HTTPS."
              />

              <Switch
                v-model="wwwCanonEnabled"
                label="WWW canonicalization"
                description="Redirect between the www and non-www version of your domain."
              />
              <Field v-if="wwwCanonEnabled" label="Direction" class="cfg__indent">
                <Select v-model="wwwDirection" :options="wwwDirectionOptions" />
              </Field>

              <Field
                v-if="showPrimaryDomain"
                label="Primary domain"
                :error="errors.primaryDomain"
                class="cfg__indent"
              >
                <Input
                  v-model="primaryDomain"
                  placeholder="example.com"
                  :invalid="!!errors.primaryDomain"
                />
              </Field>

              <Switch
                v-model="customDomainRedirect"
                label="Redirect to custom domain"
                description="Send all traffic to a different domain."
              />
              <template v-if="customDomainRedirect">
                <Field
                  label="Target domain"
                  :error="errors.customDomainRedirectTarget"
                  class="cfg__indent"
                >
                  <Input
                    v-model="customDomainRedirectTarget"
                    placeholder="newdomain.com"
                    :invalid="!!errors.customDomainRedirectTarget"
                  />
                </Field>
                <Switch v-model="preservePath" label="Preserve path" class="cfg__indent" />
              </template>
            </CardBody>
          </Card>

          <Card elevation="flat">
            <CardHeader title="Performance" />
            <CardBody class="cfg__card-body">
              <Switch
                v-model="compression"
                label="Gzip/Brotli compression"
                description="Compress text-based responses."
              />

              <Switch
                v-model="cachingEnabled"
                label="Browser caching"
                description="Set long cache lifetimes for static assets."
              />
              <div v-if="cachingEnabled" class="cfg__row cfg__indent">
                <Field label="Duration" :error="errors.cachingDuration">
                  <NumberInput v-model="cachingDuration" :min="1" align="left" />
                </Field>
                <Field label="Unit">
                  <Select v-model="cachingUnit" :options="cachingUnitOptions" />
                </Field>
              </div>
            </CardBody>
          </Card>

          <Card elevation="flat">
            <CardHeader title="Security" />
            <CardBody class="cfg__card-body">
              <Switch v-model="directoryListing" label="Allow directory listing" />

              <Switch v-model="errorPage404Enabled" label="Custom 404 error page" />
              <Field
                v-if="errorPage404Enabled"
                label="404 page path"
                :error="errors.errorPage404Path"
                class="cfg__indent"
              >
                <Input
                  v-model="errorPage404Path"
                  placeholder="/404.html"
                  :invalid="!!errors.errorPage404Path"
                />
              </Field>

              <Switch v-model="errorPage500Enabled" label="Custom 500 error page" />
              <Field
                v-if="errorPage500Enabled"
                label="500 page path"
                :error="errors.errorPage500Path"
                class="cfg__indent"
              >
                <Input
                  v-model="errorPage500Path"
                  placeholder="/500.html"
                  :invalid="!!errors.errorPage500Path"
                />
              </Field>

              <Switch v-model="corsEnabled" label="CORS headers" />
              <Field
                v-if="corsEnabled"
                label="Allowed origin"
                :error="errors.corsOrigin"
                class="cfg__indent"
              >
                <Input v-model="corsOrigin" placeholder="*" :invalid="!!errors.corsOrigin" />
              </Field>

              <Switch
                v-model="basicAuthEnabled"
                label="Basic auth"
                description="Password-protect this site or path."
              />
              <template v-if="basicAuthEnabled">
                <Field label="Realm" :error="errors.basicAuthRealm" class="cfg__indent">
                  <Input
                    v-model="basicAuthRealm"
                    placeholder="Restricted"
                    :invalid="!!errors.basicAuthRealm"
                  />
                </Field>
                <Field
                  label="Password file path"
                  :error="errors.basicAuthUserFilePath"
                  class="cfg__indent"
                >
                  <Input
                    v-model="basicAuthUserFilePath"
                    placeholder="/etc/.htpasswd"
                    :invalid="!!errors.basicAuthUserFilePath"
                  />
                </Field>
              </template>
            </CardBody>
          </Card>

          <Card elevation="flat">
            <CardHeader title="Routing" />
            <CardBody class="cfg__card-body">
              <Switch
                v-model="spaFallback"
                label="SPA fallback"
                description="Serve index.html for unknown routes (client-side routers)."
              />
            </CardBody>
          </Card>
        </div>

        <div class="cfg__output">
          <OutputPanel label="Config" :empty="output === ''" :empty-description="emptyDescription">
            <template #actions>
              <Button variant="ghost" size="sm" aria-label="Download config" @click="download">
                <template #icon><Icon :name="UI_ICON.download" size="15" /></template>
                Download
              </Button>
            </template>

            <Snippet
              variant="block"
              :code="output"
              :language="serverType === 'apache' ? 'apache' : 'nginx'"
              line-numbers
            />
          </OutputPanel>
          <p v-if="serverType === 'apache' && output !== ''" class="cfg__download-note">
            Downloads as htaccess.txt on Chrome — rename to .htaccess after saving.
          </p>
        </div>
      </div>
    </div>
  </ToolPage>
</template>

<style scoped>
.cfg {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.cfg__grid {
  display: grid;
  grid-template-columns: minmax(320px, 1fr) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}
.cfg__options {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  min-width: 0;
}
.cfg__card-body {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}
.cfg__indent {
  margin-left: 0.25rem;
  padding-left: 0.75rem;
  border-left: 2px solid var(--border-subtle);
}
.cfg__row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.cfg__row > * {
  flex: 1 1 120px;
}
.cfg__output {
  position: sticky;
  top: 1rem;
  min-width: 0;
}
.cfg__download-note {
  margin: 0.4rem 0 0;
  text-align: right;
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

@media (max-width: 900px) {
  .cfg__grid {
    grid-template-columns: 1fr;
  }
  .cfg__output {
    position: static;
  }
}
</style>
