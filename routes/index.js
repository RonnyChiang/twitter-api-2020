const express = require('express')
const router = express.Router()
const userController = require('../controllers/user-controller')
const tweetController = require('../controllers/tweet-controller')
const replyController = require('../controllers/reply-controller')
const adminController = require('../controllers/admin-controller')
const likeController = require('../controllers/like-controller')
const followshipController = require('../controllers/followship-controller')
const { apiErrorHandler } = require('../middleware/error-handler')
const { authenticated, authenticatedUser, authenticatedAdmin } = require('../middleware/api-auth')
const upload = require('../middleware/multer')


router.get('/', (req, res) => {
  res.send('Hello World!')
})
router.post('/api/tweets/:id/replies', authenticated, replyController.postReply)
router.get('/api/tweets/:id/replies', authenticated, replyController.getReplies)
router.get('/api/tweets/:tweetId', authenticated, tweetController.getTweet)
router.post('/api/tweets/:tweetId/like', authenticated, likeController.likeTweet)
router.post('/api/tweets/:tweetId/unlike', authenticated, likeController.unlikeTweet)
router.post('/api/tweets', authenticated, tweetController.postTweet)
router.get('/api/tweets', authenticated, tweetController.getTweets)
router.put('/api/users/account/setting', authenticated, userController.putSetting)
router.get('/api/users/:id/replied_tweets', authenticated, userController.getUserReplies)
router.get('/api/users/:id/likes', authenticated, userController.getUserLikes)
router.get('/api/users/:id/tweets', authenticated, userController.getUserTweets)
router.get('/api/users/:id/followings', authenticated, userController.getUserFollowings)
router.get('/api/users/:id/followers', authenticated, userController.getUserFollowers)
router.get('/api/users/top', authenticated, userController.getTopUsers)
router.delete('/api/followships/:id', authenticated, followshipController.deleteFollowships)
router.post('/api/followships', authenticated, followshipController.postFollowships)
router.put('/api/users/:id', authenticated, upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'cover', maxCount: 1 }
]), userController.putUser)
router.get('/api/users/:id', authenticated, userController.getUser)
router.post('/api/users', userController.signUp)
router.post('/api/signin', userController.signIn)
router.post('/api/admin/signin', adminController.signIn)
router.get('/api/admin/tweets', authenticated, adminController.getTweets)
router.delete('/api/admin/tweets/:id', authenticated, adminController.deleteTweet)
router.get('/api/admin/users', authenticated, adminController.getUsers)
router.use('/', apiErrorHandler) //放最後一關檢查

module.exports = router