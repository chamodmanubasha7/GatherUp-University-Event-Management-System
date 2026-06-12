import Category from '../models/Category.js';

export async function listCategories(_req, res) {
  const items = await Category.find().sort({ name: 1 });
  res.json(items);
}

export async function createCategory(req, res) {
  try {
    const { name, description } = req.body;
    const cat = await Category.create({ name: name?.trim(), description: description || '' });
    res.status(201).json(cat);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Category name already exists' });
    }
    res.status(400).json({ message: err.message });
  }
}

export async function updateCategory(req, res) {
  try {
    const { name, description } = req.body;
    const cat = await Category.findByIdAndUpdate(
      req.params.id,
      { name: name?.trim(), description },
      { new: true, runValidators: true }
    );
    if (!cat) return res.status(404).json({ message: 'Category not found' });
    res.json(cat);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Category name already exists' });
    }
    res.status(400).json({ message: err.message });
  }
}

export async function deleteCategory(req, res) {
  const cat = await Category.findByIdAndDelete(req.params.id);
  if (!cat) return res.status(404).json({ message: 'Category not found' });
  res.json({ message: 'Deleted' });
}
