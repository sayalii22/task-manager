const bcrypt = require('bcryptjs');
const db = require('../config/db');
const fallbackStore = require('../config/fallbackStore');

// Normalizer to guarantee consistent format across Supabase and Fallback store
function formatUser(row, includePassword = false) {
  if (!row) return null;
  const user = {
    _id: row.id || row._id,
    id: row.id || row._id,
    name: row.name,
    email: row.email,
    avatarColor: row.avatar_color || row.avatarColor || '#6366f1',
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };

  if (includePassword && row.password) {
    user.password = row.password;
  }

  // Allow compatibility with Mongoose document methods if called
  user.save = async function () {
    return await UserModel.updateProfile(user.id, {
      name: user.name,
      avatarColor: user.avatarColor,
    });
  };

  user.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, row.password);
  };

  return user;
}

const hashPassword = async (rawPassword) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(rawPassword, salt);
};

const comparePassword = async (rawPassword, hashedPassword) => {
  return await bcrypt.compare(rawPassword, hashedPassword);
};

const UserModel = {
  formatUser,
  hashPassword,
  comparePassword,

  async findByEmail(email, includePassword = false) {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();

    if (db.isConnected && db.supabase) {
      const { data, error } = await db.supabase
        .from('users')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (error) {
        console.error('Supabase findByEmail error:', error.message);
        throw error;
      }
      return formatUser(data, includePassword);
    }

    const user = fallbackStore.findUserByEmail(cleanEmail);
    if (!user) return null;
    return formatUser(user, includePassword);
  },

  async findById(id, includePassword = false) {
    if (!id) return null;

    if (db.isConnected && db.supabase) {
      const { data, error } = await db.supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('Supabase findById error:', error.message);
        throw error;
      }
      return formatUser(data, includePassword);
    }

    const user = fallbackStore.findUserById(id);
    if (!user) return null;
    return formatUser(user, includePassword);
  },

  async create(userData) {
    const avatarColors = [
      '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
      '#f97316', '#10b981', '#06b6d4', '#3b82f6',
    ];
    const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];
    const avatarColor = userData.avatarColor || randomColor;
    const hashedPassword = await hashPassword(userData.password);
    const cleanEmail = userData.email.trim().toLowerCase();

    if (db.isConnected && db.supabase) {
      const { data, error } = await db.supabase
        .from('users')
        .insert({
          name: userData.name.trim(),
          email: cleanEmail,
          password: hashedPassword,
          avatar_color: avatarColor,
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase create user error:', error.message);
        throw error;
      }
      return formatUser(data, false);
    }

    const user = fallbackStore.createUser({
      name: userData.name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      avatarColor,
    });
    return formatUser(user, false);
  },

  async updateProfile(id, updateData) {
    const fields = {};
    if (updateData.name !== undefined) fields.name = updateData.name.trim();
    if (updateData.avatarColor !== undefined) {
      fields.avatar_color = updateData.avatarColor;
      fields.avatarColor = updateData.avatarColor;
    }

    if (db.isConnected && db.supabase) {
      const dbFields = {};
      if (fields.name) dbFields.name = fields.name;
      if (fields.avatar_color) dbFields.avatar_color = fields.avatar_color;
      dbFields.updated_at = new Date().toISOString();

      const { data, error } = await db.supabase
        .from('users')
        .update(dbFields)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return formatUser(data, false);
    }

    const user = fallbackStore.findUserById(id);
    if (user) {
      if (fields.name) user.name = fields.name;
      if (fields.avatarColor) user.avatarColor = fields.avatarColor;
      fallbackStore.persistStore();
    }
    return formatUser(user, false);
  },

  async updatePassword(id, newPassword) {
    const hashedPassword = await hashPassword(newPassword);

    if (db.isConnected && db.supabase) {
      const { data, error } = await db.supabase
        .from('users')
        .update({
          password: hashedPassword,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return formatUser(data, false);
    }

    const user = fallbackStore.findUserById(id);
    if (user) {
      user.password = hashedPassword;
      fallbackStore.persistStore();
    }
    return formatUser(user, false);
  },
};

module.exports = UserModel;
