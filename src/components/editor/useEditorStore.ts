// Estado do editor composável: reducer puro sobre EmailDoc + histórico (undo/redo).
// Sem dependência externa (padrão do projeto: useReducer). Updates imutáveis por id.
import { useReducer } from "react";
import {
  type Column,
  type EmailDoc,
  type Section,
  type Widget,
  type WidgetType,
  emptyDoc,
  makeSection,
  uid,
} from "@/lib/doc-model";

export interface EditorState {
  doc: EmailDoc;
  selectedId: string | null;
  past: EmailDoc[];
  future: EmailDoc[];
}

export type EditorAction =
  | { type: "LOAD_DOC"; doc: EmailDoc }
  | { type: "RESET_BLANK" }
  | { type: "SELECT"; id: string | null }
  | { type: "UPDATE_META"; patch: Partial<EmailDoc["meta"]> }
  | { type: "ADD_SECTION"; colCount: 1 | 2 | 3 }
  | { type: "REMOVE_SECTION"; id: string }
  | { type: "MOVE_SECTION"; id: string; dir: -1 | 1 }
  | { type: "UPDATE_SECTION"; id: string; patch: Partial<Section> }
  | { type: "SET_COLUMNS"; sectionId: string; colCount: 1 | 2 | 3 }
  | { type: "ADD_WIDGET"; columnId: string; widget: Widget; index?: number; select?: boolean }
  | { type: "UPDATE_WIDGET"; id: string; patch: Partial<Widget> }
  | { type: "REMOVE_WIDGET"; id: string }
  | { type: "DUPLICATE_WIDGET"; id: string }
  | { type: "MOVE_WIDGET"; id: string; dir: -1 | 1 }
  | { type: "REORDER_IN_COLUMN"; columnId: string; activeId: string; overId: string }
  | { type: "MOVE_WIDGET_TO_COLUMN"; widgetId: string; toColumnId: string; index?: number }
  | { type: "UNDO" }
  | { type: "REDO" };

// ————— helpers imutáveis de árvore —————
function mapSections(doc: EmailDoc, fn: (s: Section) => Section): EmailDoc {
  return { ...doc, sections: doc.sections.map(fn) };
}
function mapColumns(sec: Section, fn: (c: Column) => Column): Section {
  return { ...sec, columns: sec.columns.map(fn) };
}

function findColumnOfWidget(doc: EmailDoc, widgetId: string): { sec: Section; col: Column } | null {
  for (const sec of doc.sections)
    for (const col of sec.columns)
      if (col.widgets.some((w) => w.id === widgetId)) return { sec, col };
  return null;
}

function move<T>(arr: T[], idx: number, dir: -1 | 1): T[] {
  const j = idx + dir;
  if (idx < 0 || j < 0 || j >= arr.length) return arr;
  const copy = arr.slice();
  const [it] = copy.splice(idx, 1);
  copy.splice(j, 0, it);
  return copy;
}

function reduceDoc(doc: EmailDoc, action: EditorAction): EmailDoc {
  switch (action.type) {
    case "UPDATE_META":
      return { ...doc, meta: { ...doc.meta, ...action.patch } };

    case "ADD_SECTION":
      return { ...doc, sections: [...doc.sections, makeSection(action.colCount)] };

    case "REMOVE_SECTION":
      return { ...doc, sections: doc.sections.filter((s) => s.id !== action.id) };

    case "MOVE_SECTION": {
      const idx = doc.sections.findIndex((s) => s.id === action.id);
      return { ...doc, sections: move(doc.sections, idx, action.dir) };
    }

    case "UPDATE_SECTION":
      return mapSections(doc, (s) => (s.id === action.id ? { ...s, ...action.patch } : s));

    case "SET_COLUMNS":
      return mapSections(doc, (s) => {
        if (s.id !== action.sectionId) return s;
        const cur = s.columns;
        const next: Column[] = [];
        for (let i = 0; i < action.colCount; i++) {
          next.push(cur[i] ?? { id: uid(), span: 1, vAlign: "top", widgets: [] });
        }
        // se reduziu colunas, joga os widgets das colunas extras na última mantida
        if (cur.length > action.colCount) {
          const extra = cur.slice(action.colCount).flatMap((c) => c.widgets);
          next[action.colCount - 1] = {
            ...next[action.colCount - 1],
            widgets: [...next[action.colCount - 1].widgets, ...extra],
          };
        }
        return { ...s, columns: next };
      });

    case "ADD_WIDGET":
      return mapSections(doc, (s) =>
        mapColumns(s, (c) => {
          if (c.id !== action.columnId) return c;
          const widgets = c.widgets.slice();
          const at = action.index == null ? widgets.length : action.index;
          widgets.splice(at, 0, action.widget);
          return { ...c, widgets };
        }),
      );

    case "REORDER_IN_COLUMN":
      return mapSections(doc, (s) =>
        mapColumns(s, (c) => {
          if (c.id !== action.columnId) return c;
          const from = c.widgets.findIndex((w) => w.id === action.activeId);
          const to = c.widgets.findIndex((w) => w.id === action.overId);
          if (from < 0 || to < 0) return c;
          const widgets = c.widgets.slice();
          const [it] = widgets.splice(from, 1);
          widgets.splice(to, 0, it);
          return { ...c, widgets };
        }),
      );

    case "MOVE_WIDGET_TO_COLUMN": {
      const loc = findColumnOfWidget(doc, action.widgetId);
      if (!loc || loc.col.id === action.toColumnId) return doc;
      const w = loc.col.widgets.find((x) => x.id === action.widgetId)!;
      return mapSections(doc, (s) =>
        mapColumns(s, (c) => {
          if (c.id === loc.col.id)
            return { ...c, widgets: c.widgets.filter((x) => x.id !== action.widgetId) };
          if (c.id === action.toColumnId) {
            const widgets = c.widgets.slice();
            const at = action.index == null ? widgets.length : action.index;
            widgets.splice(at, 0, w);
            return { ...c, widgets };
          }
          return c;
        }),
      );
    }

    case "UPDATE_WIDGET":
      return mapSections(doc, (s) =>
        mapColumns(s, (c) => ({
          ...c,
          widgets: c.widgets.map((w) =>
            w.id === action.id ? ({ ...w, ...action.patch } as Widget) : w,
          ),
        })),
      );

    case "REMOVE_WIDGET":
      return mapSections(doc, (s) =>
        mapColumns(s, (c) => ({ ...c, widgets: c.widgets.filter((w) => w.id !== action.id) })),
      );

    case "DUPLICATE_WIDGET":
      return mapSections(doc, (s) =>
        mapColumns(s, (c) => {
          const idx = c.widgets.findIndex((w) => w.id === action.id);
          if (idx < 0) return c;
          const copy = { ...c.widgets[idx], id: uid() } as Widget;
          const widgets = c.widgets.slice();
          widgets.splice(idx + 1, 0, copy);
          return { ...c, widgets };
        }),
      );

    case "MOVE_WIDGET": {
      const loc = findColumnOfWidget(doc, action.id);
      if (!loc) return doc;
      return mapSections(doc, (s) =>
        mapColumns(s, (c) => {
          if (c.id !== loc.col.id) return c;
          const idx = c.widgets.findIndex((w) => w.id === action.id);
          return { ...c, widgets: move(c.widgets, idx, action.dir) };
        }),
      );
    }

    default:
      return doc;
  }
}

const HISTORY_ACTIONS = new Set([
  "UPDATE_META",
  "ADD_SECTION",
  "REMOVE_SECTION",
  "MOVE_SECTION",
  "UPDATE_SECTION",
  "SET_COLUMNS",
  "ADD_WIDGET",
  "UPDATE_WIDGET",
  "REMOVE_WIDGET",
  "DUPLICATE_WIDGET",
  "MOVE_WIDGET",
  "REORDER_IN_COLUMN",
  "MOVE_WIDGET_TO_COLUMN",
]);

function reducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "LOAD_DOC":
      return { doc: action.doc, selectedId: null, past: [], future: [] };
    case "RESET_BLANK":
      return { doc: emptyDoc(), selectedId: null, past: [], future: [] };
    case "SELECT":
      return { ...state, selectedId: action.id };
    case "UNDO": {
      if (!state.past.length) return state;
      const prev = state.past[state.past.length - 1];
      return {
        ...state,
        doc: prev,
        past: state.past.slice(0, -1),
        future: [state.doc, ...state.future],
      };
    }
    case "REDO": {
      if (!state.future.length) return state;
      const next = state.future[0];
      return {
        ...state,
        doc: next,
        past: [...state.past, state.doc],
        future: state.future.slice(1),
      };
    }
    default: {
      const doc = reduceDoc(state.doc, action);
      if (doc === state.doc) return state;
      const selectedId =
        action.type === "ADD_WIDGET" && action.select ? action.widget.id : state.selectedId;
      if (HISTORY_ACTIONS.has(action.type)) {
        return {
          ...state,
          doc,
          selectedId,
          past: [...state.past, state.doc].slice(-50),
          future: [],
        };
      }
      return { ...state, doc, selectedId };
    }
  }
}

export function useEditorStore(initial?: EmailDoc) {
  return useReducer(reducer, undefined, () => ({
    doc: initial ?? emptyDoc(),
    selectedId: null,
    past: [],
    future: [],
  }));
}
