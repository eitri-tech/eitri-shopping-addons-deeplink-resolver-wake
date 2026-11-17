import Eitri from 'eitri-bifrost'

// UTM guardada pelo resolver -> parâmetro do campaign_details do GA4
const CAMPAIGN_PARAMS = {
	utm_source: 'source',
	utm_medium: 'medium',
	utm_campaign: 'campaign',
	utm_term: 'term',
	utm_content: 'content',
	utm_id: 'campaign_id',
	utm_campaignid: 'campaign_id'
}

// o Firebase aceita até 100 caracteres por valor
const MAX_VALUE_LENGTH = 100

const toParamValue = value => {
	if (typeof value !== 'string' || value === '') return ''

	let decoded = value

	try {
		decoded = decodeURIComponent(value.replace(/\+/g, ' '))
	} catch {
		// valor com % solto: segue como veio no link
	}

	return decoded.trim().substring(0, MAX_VALUE_LENGTH)
}

/**
 * Envia ao GA4 o campaign_details com as UTMs do link que abriu o app: é ele que atribui a sessão (e as compras
 * dela) à campanha. Sem nenhuma UTM conhecida não envia nada. Nunca lança erro, para não segurar o redirecionamento.
 * @param {Object} [utmParams] - UTMs com as chaves normalizadas pelo UtmService (utm_source, utm_medium...)
 */
export const sendCampaignDetails = async utmParams => {
	try {
		const data = {}

		Object.entries(utmParams || {}).forEach(([key, value]) => {
			const param = CAMPAIGN_PARAMS[key]
			const paramValue = toParamValue(value)

			if (param && paramValue) data[param] = paramValue
		})

		if (Object.keys(data).length === 0) return

		const modules = await Eitri.modules()
		// apps mais antigos só têm o namespace fb
		const firebase = modules?.firebase ?? modules?.fb

		if (typeof firebase?.logEvent !== 'function') {
			console.warn('[campaign_details] módulo do Firebase indisponível')

			return
		}

		await firebase.logEvent({ eventName: 'campaign_details', data })
	} catch (e) {
		console.error('[campaign_details]', e)
	}
}
