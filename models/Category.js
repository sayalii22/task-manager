const db = require('../config/db');
const fallbackStore = require('../config/fallbackStore');

const DEFAULT_CATEGORIES = [
  { name: 'Work', color: '#3b82f6', icon: 'briefcase', isDefault: true },
  { name: 'Personal', color: '#8b5cf6', icon: 'user', isDefault: true },
  { name: 'Study', color: '#ec4899', icon: 'graduation-cap', isDefault: true },
  { name: 'Shopping', color: '#f59e0b', icon: 'shopping-cart', isDefault: true },
  { name: 'Health', color: '#10b981', icon: 'heart-pulse', isDefault: true },
  { name: 'Other', color: '#64748b', icon: 'bookmark', isDefault: true },
];

function formatCategory(row) {
  if (!row) return null;
  return {
    _id: row.id || row._id,
    id: row.id || row._id,
    user: row.user_id || row.user || null,
    name: row.name,
    color: row.color || '#6366f1',
    icon: row.icon || 'folder',
    isDefault: Boolean(row.is_default ?? row.isDefault ?? false),
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

const CategoryModel = {
  DEFAULT_CATEGORIES,
  formatCategory,

  async findByUser(userId) {
    if (db.isConnected && db.supabase) {
      const { data, error } = await db.supabase
        .from('categories')
        .select('*')
        .or(`user_id.eq.${userId},is_default.eq.true`)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Supabase findByUser categories error:', error.message);
        throw error;
      }

      if (!data || data.length === 0) {
        return DEFAULT_CATEGORIES.map((c) => ({
          _id: c.name.toLowerCase(),
          id: c.name.toLowerCase(),
          ...c,
        }));
      }

      return data.map(formatCategory);
    }

    const userCats = fallbackStore.findCategoriesByUser(userId);
    const combined = [
      ...DEFAULT_CATEGORIES.map((c) => ({
        _id: `def_${c.name.toLowerCase()}`,
        id: `def_${c.name.toLowerCase()}`,
        ...c,
      })),
      ...userCats.map(formatCategory),
    ];
    return combined;
  },

  async findById(id) {
    if (!id) return null;

    if (db.isConnected && db.supabase) {
      const { data, error } = await db.supabase
        .from('categories')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        return null;
      }
      return formatCategory(data);
    }

    const def = DEFAULT_CATEGORIES.find(
      (c) =>
        `def_${c.name.toLowerCase()}` === String(id) ||
        c.name.toLowerCase() === String(id)
    );
    if (def) return { _id: id, id, ...def };

    const cat = fallbackStore.findCategoryById(id);
    return formatCategory(cat);
  },

  async create(catData) {
    if (db.isConnected && db.supabase) {
      const { data, error } = await db.supabase
        .from('categories')
        .insert({
          user_id: catData.user,
          name: catData.name.trim(),
          color: catData.color || '#6366f1',
          icon: catData.icon || 'folder',
          is_default: false,
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase create category error:', error.message);
        throw error;
      }
      return formatCategory(data);
    }

    return formatCategory(fallbackStore.createCategory(catData));
  },

  async update(id, updateData, userId) {
    if (db.isConnected && db.supabase) {
      const updateFields = {};
      if (updateData.name !== undefined) updateFields.name = updateData.name.trim();
      if (updateData.color !== undefined) updateFields.color = updateData.color;
      if (updateData.icon !== undefined) updateFields.icon = updateData.icon;
      updateFields.updated_at = new Date().toISOString();

      const { data, error } = await db.supabase
        .from('categories')
        .update(updateFields)
        .eq('id', id)
        .eq('user_id', userId)
        .eq('is_default', false)
        .select()
        .maybeSingle();

      if (error) throw error;
      return formatCategory(data);
    }

    const cat = fallbackStore.findCategoryById(id);
    if (!cat || String(cat.user) !== String(userId) || cat.isDefault) return null;
    Object.assign(cat, updateData, { updatedAt: new Date().toISOString() });
    fallbackStore.persistStore();
    return formatCategory(cat);
  },

  async delete(id, userId) {
    if (db.isConnected && db.supabase) {
      const { data, error } = await db.supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
        .eq('is_default', false)
        .select()
        .maybeSingle();

      if (error) throw error;
      return formatCategory(data);
    }

    return formatCategory(fallbackStore.deleteCategory(id, userId));
  },
};

module.exports = CategoryModel;
