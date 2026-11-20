import { createFileRoute } from '@tanstack/react-router'

import { MarkdownPage, markdownPageRoute } from '@/modules/pages/markdown-page'

// Content: src/content/pages/privacy-policy.md
export const Route = createFileRoute('/$lng/_public/privacy-policy')({
  ...markdownPageRoute('privacy-policy'),
  component: function Page() {
    const { lng } = Route.useParams()
    return <MarkdownPage lng={lng} page={Route.useLoaderData()} />
  },
})
