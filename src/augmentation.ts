import type { CodeBlockSyntaxHighlight, CodeBlockSyntaxHighlightConfig } from './index.js';

declare module '@ckeditor/ckeditor5-core' {
  interface EditorConfig {
    /**
     * The configuration of the {@link CodeBlockSyntaxHighlight} feature.
     */
    codeBlockSyntaxHighlight?: CodeBlockSyntaxHighlightConfig;
  }

  interface PluginsMap {
    [CodeBlockSyntaxHighlight.pluginName]: CodeBlockSyntaxHighlight;
  }
}
