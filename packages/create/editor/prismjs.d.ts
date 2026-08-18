declare module "prismjs" {
  interface Prism {
    highlightAll: () => void;
    highlight: (text: string, grammar: any, language: string) => string;
    tokenize: (
      text: string,
      grammar: any,
      language?: string
    ) => Array<{ type: string; content: string }>;
    languages: Record<string, any>;
  }
  const Prism: Prism;
  export default Prism;
}
