const Category = require('../models/Category');

// @desc    Get all categories for logged-in user + defaults
// @route   GET /api/categories
// @access  Private
const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.findByUser(req.user._id);
    res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a custom category
// @route   POST /api/categories
// @access  Private
const createCategory = async (req, res, next) => {
  try {
    const { name, color, icon } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required.',
      });
    }

    const category = await Category.create({
      user: req.user._id,
      name: name.trim(),
      color: color || '#6366f1',
      icon: icon || 'folder',
      isDefault: false,
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully!',
      category,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update custom category
// @route   PUT /api/categories/:id
// @access  Private
const updateCategory = async (req, res, next) => {
  try {
    const { name, color, icon } = req.body;
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.',
      });
    }

    if (category.isDefault) {
      return res.status(400).json({
        success: false,
        message: 'Default system categories cannot be modified.',
      });
    }

    const updated = await Category.update(
      req.params.id,
      {
        ...(name && { name: name.trim() }),
        ...(color && { color }),
        ...(icon && { icon }),
      },
      req.user._id
    );

    res.status(200).json({
      success: true,
      message: 'Category updated successfully!',
      category: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete custom category
// @route   DELETE /api/categories/:id
// @access  Private
const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.',
      });
    }

    if (category.isDefault) {
      return res.status(400).json({
        success: false,
        message: 'Default system categories cannot be deleted.',
      });
    }

    await Category.delete(req.params.id, req.user._id);

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
