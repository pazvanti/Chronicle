import { EpubChapter, ProjectFolder } from '../../types/project';

export interface BinderFolderNode {
  type: 'folder';
  id: string;
  name: string;
  parentId: string | null;
  order: number;
  isExpanded: boolean;
  color?: string;
  children: BinderItemNode[];
}

export interface BinderChapterNode {
  type: 'chapter';
  id: string;
  chapter: EpubChapter;
  folderId: string | null;
  order: number;
}

export type BinderItemNode = BinderFolderNode | BinderChapterNode;

/**
 * Recursively retrieves the minimum chapter reading order for a folder.
 */
function getFolderMinChapterOrder(node: BinderFolderNode): number | null {
  let min: number | null = null;
  for (const child of node.children) {
    if (child.type === 'chapter') {
      if (min === null || child.order < min) min = child.order;
    } else {
      const subMin = getFolderMinChapterOrder(child);
      if (subMin !== null && (min === null || subMin < min)) min = subMin;
    }
  }
  return min;
}

/**
 * Builds a hierarchical BinderItemNode tree from flat folders and chapters arrays.
 */
export function buildBinderTree(
  folders: ProjectFolder[],
  chapters: EpubChapter[]
): BinderItemNode[] {
  const folderMap = new Map<string, BinderFolderNode>();

  // 1. Initialize folder nodes
  folders.forEach((f, idx) => {
    folderMap.set(f.id, {
      type: 'folder',
      id: f.id,
      name: f.name || 'Untitled Section',
      parentId: f.parentId || null,
      order: typeof f.order === 'number' ? f.order : idx,
      isExpanded: f.isExpanded !== false,
      color: f.color,
      children: [],
    });
  });

  const rootItems: BinderItemNode[] = [];

  // 2. Attach chapters to folders or root
  chapters.forEach((ch, idx) => {
    const chapterNode: BinderChapterNode = {
      type: 'chapter',
      id: ch.id,
      chapter: ch,
      folderId: ch.folderId || null,
      order: typeof ch.order === 'number' ? ch.order : idx,
    };

    if (ch.folderId && folderMap.has(ch.folderId)) {
      folderMap.get(ch.folderId)!.children.push(chapterNode);
    } else {
      rootItems.push(chapterNode);
    }
  });

  // 3. Attach folders to parent folders or root
  folderMap.forEach(folderNode => {
    if (folderNode.parentId && folderMap.has(folderNode.parentId)) {
      // Prevent cyclic parent references
      if (folderNode.parentId !== folderNode.id) {
        folderMap.get(folderNode.parentId)!.children.push(folderNode);
      } else {
        folderNode.parentId = null;
        rootItems.push(folderNode);
      }
    } else {
      folderNode.parentId = null;
      rootItems.push(folderNode);
    }
  });

  // 4. Sort children inside each container
  function sortContainerChildren(
    items: BinderItemNode[],
    preferredOrder?: string[]
  ): BinderItemNode[] {
    if (preferredOrder && preferredOrder.length > 0) {
      const orderMap = new Map(preferredOrder.map((id, index) => [id, index]));
      return [...items].sort((a, b) => {
        const orderA = orderMap.has(a.id) ? orderMap.get(a.id)! : 99999;
        const orderB = orderMap.has(b.id) ? orderMap.get(b.id)! : 99999;
        if (orderA !== orderB) return orderA - orderB;
        return getItemSortKey(a) - getItemSortKey(b);
      });
    }

    return [...items].sort((a, b) => getItemSortKey(a) - getItemSortKey(b));
  }

  function getItemSortKey(item: BinderItemNode): number {
    if (item.type === 'chapter') {
      return item.order;
    }
    const minCh = getFolderMinChapterOrder(item);
    if (minCh !== null) {
      return minCh;
    }
    // Empty folder fallback: place by folder order
    return item.order * 1000 + 500;
  }

  function sortTree(nodes: BinderItemNode[]): BinderItemNode[] {
    const sorted = sortContainerChildren(nodes);
    sorted.forEach(node => {
      if (node.type === 'folder') {
        const folderData = folders.find(f => f.id === node.id);
        node.children = sortContainerChildren(node.children, folderData?.itemOrder);
        node.children = sortTree(node.children);
      }
    });
    return sorted;
  }

  return sortTree(rootItems);
}

/**
 * Flattens a BinderItemNode tree depth-first to update reading order and folder hierarchy.
 */
export function flattenBinderTree(tree: BinderItemNode[]): {
  chapters: EpubChapter[];
  folders: ProjectFolder[];
} {
  const chapters: EpubChapter[] = [];
  const folders: ProjectFolder[] = [];
  let readingOrder = 0;

  function traverse(nodes: BinderItemNode[], parentId: string | null) {
    nodes.forEach((node, idx) => {
      if (node.type === 'chapter') {
        const updatedChapter: EpubChapter = {
          ...node.chapter,
          order: readingOrder++,
          folderId: parentId,
        };
        chapters.push(updatedChapter);
      } else if (node.type === 'folder') {
        const itemOrder = node.children.map(c => c.id);
        const updatedFolder: ProjectFolder = {
          id: node.id,
          name: node.name,
          parentId,
          order: idx,
          isExpanded: node.isExpanded,
          color: node.color,
          itemOrder,
        };
        folders.push(updatedFolder);
        traverse(node.children, node.id);
      }
    });
  }

  traverse(tree, null);
  return { chapters, folders };
}

/**
 * Checks if potentialDescendantId is equal to or a child of ancestorId.
 */
export function isDescendantFolder(
  folders: ProjectFolder[],
  potentialDescendantId: string,
  ancestorId: string
): boolean {
  if (potentialDescendantId === ancestorId) return true;
  const folderMap = new Map(folders.map(f => [f.id, f]));
  let current = folderMap.get(potentialDescendantId);

  while (current && current.parentId) {
    if (current.parentId === ancestorId) return true;
    current = folderMap.get(current.parentId);
  }

  return false;
}

/**
 * Collects all descendant folder IDs for a given folder ID.
 */
export function collectDescendantFolderIds(
  folderId: string,
  folders: ProjectFolder[]
): string[] {
  const result: string[] = [];
  const queue = [folderId];

  while (queue.length > 0) {
    const parent = queue.shift()!;
    for (const f of folders) {
      if (f.parentId === parent) {
        result.push(f.id);
        queue.push(f.id);
      }
    }
  }

  return result;
}

/**
 * Collects all chapter IDs belonging to a folder and its sub-folders.
 */
export function collectFolderChapterIds(
  folderId: string,
  folders: ProjectFolder[],
  chapters: EpubChapter[]
): string[] {
  const folderIds = new Set([folderId, ...collectDescendantFolderIds(folderId, folders)]);
  return chapters.filter(c => c.folderId && folderIds.has(c.folderId)).map(c => c.id);
}

/**
 * Calculates aggregate stats (chapter count & total word count) for a folder and its sub-folders.
 */
export function getFolderStats(
  folderId: string,
  folders: ProjectFolder[],
  chapters: EpubChapter[]
): { chapterCount: number; wordCount: number } {
  const folderIds = new Set([folderId, ...collectDescendantFolderIds(folderId, folders)]);
  let chapterCount = 0;
  let wordCount = 0;

  for (const ch of chapters) {
    if (ch.folderId && folderIds.has(ch.folderId)) {
      chapterCount++;
      wordCount += ch.wordCount || 0;
    }
  }

  return { chapterCount, wordCount };
}

/**
 * Performs drag-and-drop item movement within the binder tree.
 */
export function moveBinderItem(
  folders: ProjectFolder[],
  chapters: EpubChapter[],
  sourceId: string,
  sourceType: 'folder' | 'chapter',
  targetId: string,
  targetType: 'folder' | 'chapter',
  position: 'before' | 'after' | 'inside'
): { updatedFolders: ProjectFolder[]; updatedChapters: EpubChapter[] } {
  if (sourceId === targetId) {
    return { updatedFolders: folders, updatedChapters: chapters };
  }

  // Prevent moving folder into itself or its own descendants
  if (sourceType === 'folder') {
    if (targetType === 'folder' && isDescendantFolder(folders, targetId, sourceId)) {
      return { updatedFolders: folders, updatedChapters: chapters };
    }
    // Also if target is a chapter inside a descendant folder
    if (targetType === 'chapter') {
      const targetChapter = chapters.find(c => c.id === targetId);
      if (targetChapter?.folderId && isDescendantFolder(folders, targetChapter.folderId, sourceId)) {
        return { updatedFolders: folders, updatedChapters: chapters };
      }
    }
  }

  // Only folders can receive items 'inside'
  if (position === 'inside' && targetType !== 'folder') {
    return { updatedFolders: folders, updatedChapters: chapters };
  }

  const tree = buildBinderTree(folders, chapters);

  // 1. Locate and extract source node
  let extractedNode: BinderItemNode | null = null;

  function extractNode(nodes: BinderItemNode[]): BinderItemNode[] {
    const nextNodes: BinderItemNode[] = [];
    for (const node of nodes) {
      if (node.id === sourceId && node.type === sourceType) {
        extractedNode = node;
      } else {
        if (node.type === 'folder') {
          node.children = extractNode(node.children);
        }
        nextNodes.push(node);
      }
    }
    return nextNodes;
  }

  const treeWithoutSource = extractNode(tree);
  if (!extractedNode) {
    return { updatedFolders: folders, updatedChapters: chapters };
  }

  const movingNode = extractedNode as BinderItemNode;

  // 2. Insert into target position
  if (position === 'inside' && targetType === 'folder') {
    function insertInside(nodes: BinderItemNode[]): boolean {
      for (const node of nodes) {
        if (node.type === 'folder' && node.id === targetId) {
          if (movingNode.type === 'folder') {
            movingNode.parentId = targetId;
          } else {
            movingNode.folderId = targetId;
          }
          node.isExpanded = true;
          node.children.push(movingNode);
          return true;
        }
        if (node.type === 'folder') {
          if (insertInside(node.children)) return true;
        }
      }
      return false;
    }
    insertInside(treeWithoutSource);
  } else {
    // Before or after target
    function insertAdjacent(nodes: BinderItemNode[], parentId: string | null): boolean {
      const targetIndex = nodes.findIndex(n => n.id === targetId && n.type === targetType);
      if (targetIndex !== -1) {
        const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
        if (movingNode.type === 'folder') {
          movingNode.parentId = parentId;
        } else {
          movingNode.folderId = parentId;
        }
        nodes.splice(insertIndex, 0, movingNode);
        return true;
      }

      for (const node of nodes) {
        if (node.type === 'folder') {
          if (insertAdjacent(node.children, node.id)) return true;
        }
      }
      return false;
    }

    insertAdjacent(treeWithoutSource, null);
  }

  // 3. Flatten and sync orders
  const { chapters: updatedChapters, folders: updatedFolders } = flattenBinderTree(treeWithoutSource);
  return { updatedFolders, updatedChapters };
}

/**
 * Moves an item to the end of the root container (e.g. dropped on empty list background).
 */
export function moveItemToEndOfRoot(
  folders: ProjectFolder[],
  chapters: EpubChapter[],
  sourceId: string,
  sourceType: 'folder' | 'chapter'
): { updatedFolders: ProjectFolder[]; updatedChapters: EpubChapter[] } {
  const tree = buildBinderTree(folders, chapters);

  let extractedNode: BinderItemNode | null = null;
  function extractNode(nodes: BinderItemNode[]): BinderItemNode[] {
    const nextNodes: BinderItemNode[] = [];
    for (const node of nodes) {
      if (node.id === sourceId && node.type === sourceType) {
        extractedNode = node;
      } else {
        if (node.type === 'folder') {
          node.children = extractNode(node.children);
        }
        nextNodes.push(node);
      }
    }
    return nextNodes;
  }

  const treeWithoutSource = extractNode(tree);
  if (!extractedNode) {
    return { updatedFolders: folders, updatedChapters: chapters };
  }

  const movingNode = extractedNode as BinderItemNode;
  if (movingNode.type === 'folder') {
    movingNode.parentId = null;
  } else {
    movingNode.folderId = null;
  }

  treeWithoutSource.push(movingNode);
  const { chapters: updatedChapters, folders: updatedFolders } = flattenBinderTree(treeWithoutSource);
  return { updatedFolders, updatedChapters };
}

/**
 * Deletes a folder from the tree, optionally moving its contents to the parent level or deleting them.
 */
export function deleteFolderFromTree(
  folders: ProjectFolder[],
  chapters: EpubChapter[],
  folderId: string,
  deleteContents: boolean = false
): {
  updatedFolders: ProjectFolder[];
  updatedChapters: EpubChapter[];
  deletedChapterIds: string[];
} {
  const targetFolder = folders.find(f => f.id === folderId);
  if (!targetFolder) {
    return { updatedFolders: folders, updatedChapters: chapters, deletedChapterIds: [] };
  }

  if (deleteContents) {
    const descendantFolderIds = new Set([folderId, ...collectDescendantFolderIds(folderId, folders)]);
    const deletedChapterIds: string[] = [];
    const remainingChapters: EpubChapter[] = [];

    chapters.forEach(ch => {
      if (ch.folderId && descendantFolderIds.has(ch.folderId)) {
        deletedChapterIds.push(ch.id);
      } else {
        remainingChapters.push(ch);
      }
    });

    const remainingFolders = folders.filter(f => !descendantFolderIds.has(f.id));
    const tree = buildBinderTree(remainingFolders, remainingChapters);
    const { chapters: finalChapters, folders: finalFolders } = flattenBinderTree(tree);

    return {
      updatedFolders: finalFolders,
      updatedChapters: finalChapters,
      deletedChapterIds,
    };
  }

  // Safe delete: Move direct contents up to targetFolder's parentId
  const parentId = targetFolder.parentId || null;
  const updatedFolders = folders
    .filter(f => f.id !== folderId)
    .map(f => (f.parentId === folderId ? { ...f, parentId } : f));

  const updatedChapters = chapters.map(ch =>
    ch.folderId === folderId ? { ...ch, folderId: parentId } : ch
  );

  const tree = buildBinderTree(updatedFolders, updatedChapters);
  const { chapters: finalChapters, folders: finalFolders } = flattenBinderTree(tree);

  return {
    updatedFolders: finalFolders,
    updatedChapters: finalChapters,
    deletedChapterIds: [],
  };
}
