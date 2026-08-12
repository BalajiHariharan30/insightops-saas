import { Model, Document } from 'mongoose';

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasNextPage: boolean;
}

export async function getPaginatedData<T extends Document>(
  model: Model<T>,
  filter: any,
  limit: number,
  cursor?: string
): Promise<PaginatedResult<T>> {
  const query = { ...filter };
  
  if (cursor) {
    query._id = { $lt: cursor }; // Assumes records are ordered descending (newest first)
  }

  // Fetch limit + 1 items to determine if another page exists
  const items = await model.find(query)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .exec();

  const hasNextPage = items.length > limit;
  const paginatedItems = hasNextPage ? items.slice(0, -1) : items;
  
  const nextCursor = hasNextPage && paginatedItems.length > 0 
    ? paginatedItems[paginatedItems.length - 1]._id.toString() 
    : null;

  return {
    items: paginatedItems,
    nextCursor,
    hasNextPage,
  };
}
