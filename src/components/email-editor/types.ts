// Ponte entre o engine (fonte de verdade, @/lib/engine) e a UI do editor.
// Reconstruído: este arquivo vivia só no workspace da Lovable e nunca foi
// versionado, o que quebrava o build (`Could not resolve './types'`).

import { REGISTRY, type BlockInstance, type Preset } from "@/lib/engine";

// Registry tipado do engine (palette/global/blocks). Reexportado para a UI
// gerar formulários e a paleta de cores a partir dos metadados dos blocos.
export const registry = REGISTRY;

// Modos de export suportados pelo serializador do engine.
export type ExportMode = "content_builder" | "standalone";

// Instância de bloco com um id estável só de UI (drag/seleção/duplicação).
export type BlockWithId = BlockInstance & { _uid: string };

// Chaves de persistência local (rascunho + base de CDN do Content Builder).
export const STORAGE_KEY = "febracis-email-builder:preset";
export const CDN_KEY = "febracis-email-builder:cdn";

// Id efêmero de UI — não vai para a HTML exportada (removido por stripIds).
export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

// Adiciona _uid a cada bloco de um preset (ao carregar do preset/localStorage).
export function withIds(preset: Preset): BlockWithId[] {
  return preset.blocks.map((b) => ({ ...b, _uid: uid() }));
}

// Remove os _uid, voltando aos blocos "puros" do engine (ao salvar/serializar).
export function stripIds(blocks: BlockWithId[]): BlockInstance[] {
  return blocks.map(({ _uid, ...rest }) => rest);
}
