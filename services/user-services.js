const { User, Tweet, Like, Reply, Followship } = require('../models')
const bcrypt = require('bcryptjs')
const sequelize = require('sequelize')
const { Op } = require('sequelize');
const helper = require('../_helpers')
const uploadFile = require('../helpers/file-helpers')
const jwt = require('jsonwebtoken')
const userServices = {
  signUp: (req, cb) => {
    return Promise.all([
      User.findOne({ where: { email: req.body.email } }),
      User.findOne({ where: { account: req.body.account } })
    ])
      .then(([email, account]) => {
        if (email) throw new Error('email 已重複註冊！')
        if (account) throw new Error('account 已重複註冊！')
        if (!req.body.account.trim()) throw new Error('account為必填欄位')
        if (!req.body.email.trim()) throw new Error('email為必填欄位')
        if (req.body.name.length > 50) throw new Error('字數超出上限！')
        if (req.body.password.length < 4) throw new Error('密碼至少要有四個字')
        return bcrypt.hash(req.body.password, 10)
      })
      .then(hash => User.create({
        account: req.body.account,
        name: req.body.name,
        email: req.body.email,
        password: hash
      }))
      .then((createdUser) => {
        createdUser = createdUser.toJSON()
        delete createdUser.password
        return cb(null, { user: createdUser })
      })
      .catch(err => cb(err))
  },
  signIn: async (req, cb) => {
    try {
      let result = {}
      const { account, password } = req.body
      if (!account || !password) {
        throw new Error('All fields are required!')
      }
      const user = await User.findOne({ where: { account } })
      if (!user) {
        throw new Error('帳號不存在')
      } else if (user.role !== 'user') {
        throw new Error('帳號不存在')
      } else if (!bcrypt.compareSync(password, user.password)) {
        throw new Error('Incorrect Account or Password!')
      } else {
        result = user.toJSON()
      }
      if (result) {
        const payload = { id: user.id }
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' })
        delete result.password
        return cb(null, { token, user: result })
      }
    } catch (err) {
      return cb(err)
    }
  },
  getUser: async (req, cb) => {
    try {
      const userId = helper.getUser(req).id
      const userData = await User.findByPk(req.params.id, {
        attributes: {
          include: [
            [sequelize.literal("(SELECT COUNT(*) FROM Tweets WHERE Tweets.UserId = User.id)"), 'tweetCount'],
            [sequelize.literal("(SELECT COUNT(*) FROM Likes WHERE Likes.UserId = User.id)"), 'likeCount'],
            [sequelize.literal("(SELECT COUNT(*) FROM Replies WHERE Replies.UserId = User.id)"), 'replyCount'],
            [sequelize.literal("(SELECT COUNT(*) FROM Followships WHERE Followships.followerId = User.id)"), 'followingCount'],
            [sequelize.literal("(SELECT COUNT(*) FROM Followships WHERE Followships.followingId = User.id)"), 'followerCount'],
            [sequelize.literal(`EXISTS (SELECT 1 FROM Followships WHERE followerId = ${helper.getUser(req).id} AND followingId = User.id)`), 'isFollowed']
          ],

        },
      })
      // 禁止搜尋admin
      if (!userData) throw new Error('使用者不存在')
      if (userData.role === 'admin') throw new Error('使用者不存在')
      const isSelf = (userData.id === userId)
      const user = {
        ...userData.toJSON(),
        isSelf: isSelf,
        isFollowed: userData.dataValues.isFollowed ? true : false
      }
      delete user.password
      return cb(null, user)
    } catch (err) {
      cb(err)
    }
  },
  putUser: async (req, cb) => {
    try {
      const { name, introduction } = req.body
      const userId = helper.getUser(req).id
      if (Number(req.params.id) !== userId) throw new Error('只有本人可以這樣做')
      if (name && name.length > 50) throw new Error('暱稱字數超出上限！')
      if (introduction && introduction.length > 160) throw new Error('自我介紹字數超出上限！')
      const { files } = req
      const user = await User.findByPk(userId, {
        attributes: {
          exclude: [
            'password',
          ],
        }
      })
      if (!user) throw new Error("User didn't exist!")
      const images = {}
      if (files) {
        for (const key in files) {
          images[key] = await uploadFile(files[key][0])
        }
        await user.update({
          name: name || user.name,
          introduction: introduction || user.introduction,
          cover: images.cover ? images.cover : user.cover,
          avatar: images.avatar ? images.avatar : user.avatar
        })
      }
      await user.update({
        name: name || user.name,
        introduction: introduction || user.introduction
      })
      return cb(null, user.toJSON())
    } catch (err) {
      cb(err)
    }
  },

  putSetting: async (req, cb) => {
    try {
      const { account, name, email, password } = req.body
      const userId = helper.getUser(req).id
      if (!account) throw new Error('account is required!')
      if (name && name.length > 50) throw new Error('暱稱字數超出上限！')
      if (!email) throw new Error('email is required!')
      if (password && password.length < 4) throw new Error('密碼至少要有八個字')
      // 確認account是否重複
      const existAccount = await User.findOne({
        where: {
          account,
          [Op.not]: [
            { id: [userId] } // 排除跟自己原資料重複
          ],
        }
      })
      if (existAccount) throw new Error('Account已經有人使用')
      // 確認email是否重複
      const existEmail = await User.findOne({
        where: {
          email,
          [Op.not]: [
            { id: [userId] } // 排除跟自己原資料重複
          ],
        }
      })
      if (existEmail) throw new Error('Email已經有人使用')
      const user = await User.findByPk(userId)
      if (!user) throw new Error("User didn't exist!")
      const putUser = await user.update({
        account: account || user.account,
        name: name || user.name,
        email: email || user.email,
        password: password ? await bcrypt.hash(password, 10) : user.password
      })
      const result = putUser.toJSON()
      delete result.password
      return cb(null, result)
    } catch (err) {
      cb(err)
    }
  },
  getUserTweets: async (req, cb) => {
    try {
      // 找出目標使用者的所有推文及喜歡 回覆數
      const userTweets = await Tweet.findAll({
        where: { userId: req.params.id },
        include: [
          { model: Like, attributes: [] },
          { model: Reply, attributes: [] },
          { model: User, attributes: ['account', 'name', 'avatar'] }
        ],
        attributes: {
          include: [
            [
              sequelize.fn(
                'COUNT',
                sequelize.fn('DISTINCT', sequelize.col('Likes.id'))
              ),
              'likeCount'
            ],
            [
              sequelize.fn(
                'COUNT',
                sequelize.fn('DISTINCT', sequelize.col('Replies.id'))
              ),
              'replyCount'
            ]
          ]
        },
        group: ['Tweet.id'],
        order: [
          ['createdAt', 'DESC']
        ]
      })
      // 找出目前使用者喜歡的推文
      const likedTweets = await Like.findAll({
        where: { userId: helper.getUser(req).id },
        attributes: ['tweetId'],
        raw: true
      })
      const likedData = likedTweets.map(data =>
        data.tweetId
      )
      // 目標使用者若無推文
      if (userTweets.length === 0) throw new Error("使用者尚無任何推文")
      const result = userTweets.map(tweet => ({
        ...tweet.toJSON(),
        isLiked: likedData.includes(tweet.id)
      }))
      return cb(null, result)
    } catch (err) {
      cb(err)
    }
  },
  getUserReplies: async (req, cb) => {
    try {
      // 找出目標使用者的所有回覆
      const userReplies = await Reply.findAll({
        where: { userId: req.params.id },
        include: [
          // 將回覆的使用者資訊in進來
          { model: User, attributes: ['account', 'name', 'avatar'] },
          // 將原推文及推文者資訊in進來 
          { model: Tweet, include: { model: User, attributes: ['account', 'name'] } },
        ],
        order: [
          ['createdAt', 'DESC']
        ],
        nest: true
      })
      // 目標使用者若無推文
      if (userReplies.length === 0) throw new Error("使用者尚無任何回覆")
      return cb(null, userReplies)
    } catch (err) {
      cb(err)
    }
  },
  getUserLikes: async (req, cb) => {
    try {
      // 找出目標使用者的所有like 包含tweet及相關資訊並依喜歡由新到舊排序
      const likeData = await Like.findAll({
        where: { UserId: req.params.id },
        include: [{
          model: Tweet,
          include: [
            { model: User, attributes: ['id', 'account', 'name', 'avatar'] },
            { model: Reply, attributes: ['id'] },
            { model: Like, attributes: ['id', 'UserId'] }
          ]
        },],
        order: [
          ['createdAt', 'DESC']
        ],
        nest: true
      })
      // 目標使用者若無推文
      if (likeData.length === 0) throw new Error("使用者尚無任何喜歡的推文")
      const results = likeData.map((like) => {
        const userId = helper.getUser(req).id
        // 列出此tweet所有likes的userId
        const likedUsersId = like.Tweet.Likes.map(data =>
          data.UserId
        )
        // tweet層的資訊
        const tweet = {
          id: like.Tweet.id,
          description: like.Tweet.description,
          createdAt: like.Tweet.createdAt,
          replyCount: like.Tweet.Replies.length,
          likeCount: like.Tweet.Likes.length,
          User: like.Tweet.User,
          isLiked: likedUsersId.includes(userId)
        }
        //外層資訊
        const result = {
          id: like.id,
          createdAt: like.createdAt,
          TweetId: like.Tweet.id, // 應測試需求
          tweet
        }
        return result
      })
      return cb(null, results)
    } catch (err) {
      cb(err)
    }
  },
  getUserFollowings: async (req, cb) => {
    try {
      const userId = helper.getUser(req).id
      const followshipData = await User.findAll({
        where: { id: req.params.id, role: 'user' },
        attributes: [
          [
            sequelize.col('Followings->Followship.id'),
            'id'
          ],
          [
            sequelize.col('Followings->Followship.followerId'),
            'followerId'
          ],
          [
            sequelize.col('Followings->Followship.followingId'),
            'followingId'
          ],
          [
            sequelize.col('Followings->Followship.createdAt'),
            'createdAt'
          ],
          [
            sequelize.col('Followings->Followship.updatedAt'),
            'updatedAt'
          ]
        ],
        include: [{
          model: User, as: 'Followings', attributes: [
            'id',
            'name',
            'account',
            'avatar',
            'introduction',
            [sequelize.literal("(SELECT COUNT(*) FROM Tweets WHERE Tweets.UserId = Followings.id)"), 'tweetCount'],
            [sequelize.literal("(SELECT COUNT(*) FROM Likes WHERE Likes.UserId = Followings.id)"), 'likeCount'],
            [sequelize.literal("(SELECT COUNT(*) FROM Replies WHERE Replies.UserId = Followings.id)"), 'replyCount'],
            [sequelize.literal("(SELECT COUNT(*) FROM Followships WHERE Followships.followerId = Followings.id)"), 'followingCount'],
            [sequelize.literal("(SELECT COUNT(*) FROM Followships WHERE Followships.followingId = Followings.id)"), 'followerCount'],
            [sequelize.literal(`EXISTS (SELECT 1 FROM Followships WHERE followerId = ${userId} AND followingId = Followings.id)`), 'isFollowed']
          ]
        }],
        raw: true,
        nest: true,
        order: [[sequelize.col('createdAt'), 'DESC']]
      })
      if (followshipData.length === 0) throw new Error("使用者不存在")
      if (!followshipData[0].Followings.id) throw new Error("沒有任何的追蹤")
      const result = followshipData.map(data => ({
        ...data,
        Followings: {
          'id': data.Followings.id,
          'name': data.Followings.name,
          'account': data.Followings.account,
          'avatar': data.Followings.avatar,
          'introduction': data.Followings.introduction,
          'isFollowed': data.Followings.isFollowed ? true : false,
          'isSelf': data.Followings.id === userId,
          'Followship': data.Followings.Followship,
        }
      }))
      return cb(null, result)
    } catch (err) {
      return cb(err)
    }
  },

  getUserFollowers: async (req, cb) => {
    try {
      const userId = helper.getUser(req).id
      const followshipData = await User.findAll({
        where: { id: req.params.id, role: 'user' },
        attributes: [
          [
            sequelize.col('Followers->Followship.id'),
            'id'
          ],
          [
            sequelize.col('Followers->Followship.followerId'),
            'followerId'
          ],
          [
            sequelize.col('Followers->Followship.followingId'),
            'followingId'
          ],
          [
            sequelize.col('Followers->Followship.createdAt'),
            'createdAt'
          ],
          [
            sequelize.col('Followers->Followship.updatedAt'),
            'updatedAt'
          ]
        ],
        include: [{
          model: User, as: 'Followers', attributes: [
            'id',
            'name',
            'account',
            'avatar',
            'introduction',
            [sequelize.literal("(SELECT COUNT(*) FROM Tweets WHERE Tweets.UserId = Followers.id)"), 'tweetCount'],
            [sequelize.literal("(SELECT COUNT(*) FROM Likes WHERE Likes.UserId = Followers.id)"), 'likeCount'],
            [sequelize.literal("(SELECT COUNT(*) FROM Replies WHERE Replies.UserId = Followers.id)"), 'replyCount'],
            [sequelize.literal("(SELECT COUNT(*) FROM Followships WHERE Followships.followerId = Followers.id)"), 'followingCount'],
            [sequelize.literal("(SELECT COUNT(*) FROM Followships WHERE Followships.followingId = Followers.id)"), 'followerCount'],
            [sequelize.literal(`EXISTS (SELECT 1 FROM Followships WHERE followerId = ${userId} AND followingId = Followers.id)`), 'isFollowed']
          ]
        }],
        raw: true,
        nest: true,
        order: [[sequelize.col('createdAt'), 'DESC']]
      })
      if (followshipData.length === 0) throw new Error("使用者不存在")
      if (!followshipData[0].Followers.id) throw new Error("沒有任何追蹤者")
      const result = followshipData.map(data => ({
        ...data,
        Followers: {
          'id': data.Followers.id,
          'name': data.Followers.name,
          'account': data.Followers.account,
          'avatar': data.Followers.avatar,
          'introduction': data.Followers.introduction,
          'isFollowed': data.Followers.isFollowed ? true : false,
          'isSelf': data.Followers.id === userId,
          'Followship': data.Followers.Followship,
        }
      }))
      return cb(null, result)
    } catch (err) {
      return cb(err)
    }
  },

  getTopUsers: async (req, cb) => {
    try {
      let users = await User.findAll({
        raw: true,
        nest: true,
        limit: 10,
        where: {
          role: 'user'
        },
        attributes: [
          'id',
          'name',
          'avatar',
          'account',
          //看自己有沒有追隨
          [sequelize.literal(`EXISTS (SELECT 1 FROM Followships WHERE followerId = ${helper.getUser(req).id} AND followingId = User.id)`), 'isFollowed'],
          //看追隨的人數
          [sequelize.literal('(SELECT COUNT(DISTINCT id) FROM Followships WHERE followingId = User.id)'),
            'FollowerCount'],
        ],
        order: [[sequelize.col('FollowerCount'), 'DESC']],
        // Op.gt == 大於
        having: { FollowerCount: { [sequelize.Op.gt]: 0 } },
      })
      console.log(users);
      console.log(typeof users);
      let result = users.map(user => ({
        ...user,
        isFollowed: user.isFollowed ? true : false
      }))
      console.log(result);
      return cb(null, result)
    } catch (err) {
      console.log(err);
      return cb(err)
    }
  },
  getSelfUser: async (req, cb) => {
    try {
      const UserId = helper.getUser(req).id
      const userData = await User.findByPk(UserId, {
        attributes: {
          exclude: [
            'password'
          ],
          include: [
            [sequelize.literal("(SELECT COUNT(*) FROM Tweets WHERE Tweets.UserId = User.id)"), 'tweetCount'],
            [sequelize.literal("(SELECT COUNT(*) FROM Likes WHERE Likes.UserId = User.id)"), 'likeCount'],
            [sequelize.literal("(SELECT COUNT(*) FROM Followships WHERE Followships.followerId = User.id)"), 'followingCount'],
            [sequelize.literal("(SELECT COUNT(*) FROM Followships WHERE Followships.followingId = User.id)"), 'followerCount']
          ]
        },
      })
      const user = userData.toJSON()
      delete user.password
      return cb(null, user)
    } catch (err) {
      cb(err)
    }
  },
}
module.exports = userServices