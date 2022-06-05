const express = require('express')
const app = express()
const cors = require('cors')
const AdsAPIHandler = require('./ads_api_handler')
const dotenv = require('dotenv')
dotenv.config()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())

app.get('/api/test', async (req, res) => {
  res.send({ msg: 'test' })
})

app.get('/api/customer', async (req, res) => {
  const { refreshToken } = req.query
  const customers = await new AdsAPIHandler().getCustomers(refreshToken)
  res.send(customers)
})

app.post('/api/data', async (req, res) => {
  try {
    const report = await new AdsAPIHandler().getData(req.body)
    res.send(report)
  } catch (error) {
    res.status(400)
    if (error.errors) res.send(error.errors)
    else if (error.message) res.send(error.message)
  }
})

app.listen(7002, () => {
  console.log('Server running on port 7002.')
})

module.exports = app
