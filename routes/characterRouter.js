const Router = require('express');
const router = new Router();
const characterController = require('../controllers/characterController');
const authMiddleware = require('../middleware/authMiddleware');
const checkRoleMiddleware = require('../middleware/checkRoleMiddleware');

router.get('/:id', characterController.getOne);
router.get('/', characterController.getAll);
router.post('/', authMiddleware, checkRoleMiddleware.admin, characterController.create);
router.put('/:id', characterController.update);
router.delete('/:id', characterController.delete);

module.exports = router;