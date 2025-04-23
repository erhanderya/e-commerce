const express = require('express');
const { 
  getAllProducts, 
  getProductById, 
  createProduct, 
  updateProduct, 
  deleteProduct,
  getAllCategories,
  getProductsByCategory,
  searchProducts
} = require('../controllers/productController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Categories routes
router.get('/categories', getAllCategories);
router.get('/products/category/:categoryId', getProductsByCategory);

// Search route
router.get('/products/search', searchProducts);

// Public product routes
router.get('/products', getAllProducts);
router.get('/products/:id', getProductById);

// Protected product routes (admin only in a real app)
router.post('/products', verifyToken, createProduct);
router.put('/products/:id', verifyToken, updateProduct);
router.delete('/products/:id', verifyToken, deleteProduct);

module.exports = router;