const { GoogleAdsApi } = require('google-ads-api')
const dotenv = require('dotenv')
dotenv.config()

class AdsAPIHandler {
  queryBuilder (params) {
    const { entity, attributes, metrics, segments, constraints, fromDate, toDate } = params
    const query = {
      entity,
      attributes,
      metrics,
      segments,
      constraints,
      from_date: fromDate,
      to_date: toDate,
      limit: 9999
    }

    if (query.attributes) return query

    switch (entity) {
      case 'customer':
        query.attributes = [
          'customer.id',
          'customer.currency_code',
          'customer.time_zone'
        ]
        break

      case 'campaign':
        query.attributes = [
          'campaign.id',
          'campaign.name',
          'campaign.status',
          'campaign.advertising_channel_type'
        ]
        break

      case 'ad_group':
        query.attributes = [
          'campaign.id',
          'campaign.name',
          'ad_group.id',
          'ad_group.name'
        ]
        break

      case 'ad_group_ad':
        query.attributes = [
          'campaign.id',
          'campaign.name',
          'ad_group.id',
          'ad_group.name',
          'ad_group_ad.ad.id',
          'ad_group_ad.ad.display_url',
          'ad_group_ad.ad.image_ad.image_url',
          'ad_group_ad.ad.responsive_display_ad.marketing_images',
          'ad_group_ad.ad.legacy_responsive_display_ad.marketing_image',
          'ad_group_ad.ad.display_upload_ad.media_bundle',
          'ad_group_ad.ad.type',
          'ad_group_ad.ad.name',
          'ad_group_ad.status'
        ]
        break

      default:
        break
    }
    return query
  }

  async getData (params) {
    const client = new GoogleAdsApi({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      developer_token: process.env.ADWORDS_DEVELOPER_TOKEN
    })
    const customer = client.Customer({
      customer_id: params.customerId,
      login_customer_id: params.managerId || process.env.GOOGLE_MANAGER_ID,
      refresh_token: params.refreshToken
    })

    const query = this.queryBuilder(params)
    const stream = customer.reportStream(query)

    const result = []
    for await (const row of stream) {
      result.push(row)
    }

    if (params.entity === 'ad_group_ad') {
      const labels = await customer
        .report({
          entity: 'ad_group_ad_label',
          attributes: ['ad_group_ad.ad.id', 'label.name'],
          limit: 9999
        })
        .catch(error => { throw error })
      const assets = await customer
        .report({
          entity: 'asset',
          attributes: ['asset.id', 'asset.image_asset.full_size.url'],
          limit: 9999
        })
        .catch(error => { throw error })
      return {
        labels,
        data: result,
        assets
      }
    } else {
      return { data: result }
    }
  }

  async getCustomers (refreshToken) {
    const client = new GoogleAdsApi({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      developer_token: process.env.ADWORDS_DEVELOPER_TOKEN
    })

    const customerList = await client.listAccessibleCustomers(refreshToken)

    const result = []
    for (let i = 0; i < customerList.resource_names.length; i++) {
      const id = customerList.resource_names[i].split('/').pop()
      const data = await this.getData({
        customerId: id,
        refreshToken: refreshToken,
        entity: 'customer',
        attributes: [
          'customer.id',
          'customer.currency_code',
          'customer.time_zone',
          'customer.descriptive_name',
          'customer.manager',
          'customer.test_account',
          'customer.auto_tagging_enabled'
        ]
      }).catch(() => {})
      if (data) {
        result.push({
          customerId: String(data.data[0].customer.id),
          currencyCode: data.data[0].customer.currency_code,
          dateTimeZone: data.data[0].customer.time_zone,
          descriptiveName: data.data[0].customer.descriptive_name,
          canManageClients: data.data[0].customer.manager,
          testAccount: data.data[0].customer.test_account
        })
      }
    }
    return { data: result }
  }
}

module.exports = AdsAPIHandler
