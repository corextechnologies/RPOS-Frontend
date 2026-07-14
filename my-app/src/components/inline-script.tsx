/**
 * Renders an inline script that runs synchronously during HTML parsing (before
 * first paint) on hard navigations, without tripping React's dev-time warning
 * about `<script>` tags rendered by components.
 *
 * The script executes only on the server-rendered HTML (`type="text/javascript"`).
 * On the client it renders as an inert `type="text/plain"` node, so React never
 * tries to execute it during hydration or client-side navigation.
 * See node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
