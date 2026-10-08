import { useRef, useState } from 'react';

type UseCollectionEditorOptions<T> = {
  items?: readonly T[];
  busy: boolean;
  loading: boolean;
  stale: boolean;
  unavailable: boolean;
  atLimit: boolean;
  clearMessage: () => void;
};

export const useCollectionEditor = <T>({
  items,
  busy,
  loading,
  stale,
  unavailable,
  atLimit,
  clearMessage,
}: UseCollectionEditorOptions<T>) => {
  const [editor, setEditor] = useState<{ record?: T }>();
  const [deleting, setDeleting] = useState<T>();
  const addButton = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const disabled = busy || loading || stale || unavailable || !items;

  const restoreFocus = () =>
    requestAnimationFrame(() => {
      if (addButton.current?.disabled) {
        list.current
          ?.querySelector<HTMLButtonElement>('button:not(:disabled)')
          ?.focus();
      } else addButton.current?.focus();
    });

  const openNew = () => {
    if (disabled || atLimit || editor) return;
    clearMessage();
    setEditor({});
  };
  const openEdit = (record: T) => {
    if (disabled || editor) return;
    clearMessage();
    setEditor({ record });
  };
  const requestDelete = (record: T) => {
    if (disabled || editor) return;
    clearMessage();
    setDeleting(record);
  };
  const closeEditor = () => {
    setEditor(undefined);
    restoreFocus();
  };
  const closeDelete = () => {
    setDeleting(undefined);
    restoreFocus();
  };

  return {
    editor,
    deleting,
    addButton,
    list,
    disabled,
    openNew,
    openEdit,
    requestDelete,
    closeEditor,
    closeDelete,
  };
};
