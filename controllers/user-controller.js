const userServices = require('../services/user-services')
const userController = {
  signUp: (req, res, next) => {
    userServices.signUp(req, (err, data) =>
      err ? next(err) : res.status(200).json({ status: 'success', data }))
  },
  signIn: (req, res, next) => {
    userServices.signIn(req, (err, data) =>
      err ? next(err) : res.status(200).json({ status: 'success', data }))
  },
  getUser: (req, res, next) => {
    userServices.getUser(req, (err, data) =>
      err ? next(err) : res.status(200).json(data)) // 應測試要求要第一層就能找到name只好拿掉 status
  },
  putUser: (req, res, next) => {
    userServices.putUser(req, (err, data) =>
      err ? next(err) : res.status(200).json({ status: 'success', data }))
  },
  putSetting: (req, res, next) => {
    userServices.putSetting(req, (err, data) =>
      err ? next(err) : res.status(200).json({ status: 'success', data }))
  },
  getUserTweets: (req, res, next) => {
    userServices.getUserTweets(req, (err, data) =>
      err ? next(err) : res.status(200).json(data)) // 應測試要求要array 且第一筆要是資料一 只好拿掉 status
  },
  getUserReplies: (req, res, next) => {
    userServices.getUserReplies(req, (err, data) =>
      err ? next(err) : res.status(200).json(data)) // 應測試要求要array 且第一筆要是資料一 只好拿掉 status
  },
  getUserLikes: (req, res, next) => {
    userServices.getUserLikes(req, (err, data) =>
      err ? next(err) : res.status(200).json(data)) // 應測試要求要array 且第一筆要是資料一 只好拿掉 status
  },
  getUserFollowings: (req, res, next) => {
    userServices.getUserFollowings(req, (err, data) =>
      err ? next(err) : res.status(200).json(data)) // 應測試要求要array 且第一筆要是資料一 只好拿掉 status
  },
  getUserFollowers: (req, res, next) => {
    userServices.getUserFollowers(req, (err, data) =>
      err ? next(err) : res.status(200).json(data)) // 應測試要求要array 且第一筆要是資料一 只好拿掉 status
  },
  getTopUsers: (req, res, next) => {
    userServices.getTopUsers(req, (err, data) =>
      err ? next(err) : res.status(200).json(data))
  },
  getSelfUser: (req, res, next) => {
    userServices.getSelfUser(req, (err, data) =>
      err ? next(err) : res.status(200).json({ status: 'success', data }))
  },
}
module.exports = userController