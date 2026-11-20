import { createFileRoute } from '@tanstack/react-router'

import { MarkdownPage, markdownPageRoute } from '@/modules/pages/markdown-page'

// Content: src/content/pages/terms-of-use.md
export const Route = createFileRoute('/$lng/_public/terms-of-use')({
  ...markdownPageRoute('terms-of-use'),
  component: function Page() {
    const { lng } = Route.useParams()
    return <MarkdownPage lng={lng} page={Route.useLoaderData()} />
  },
})
