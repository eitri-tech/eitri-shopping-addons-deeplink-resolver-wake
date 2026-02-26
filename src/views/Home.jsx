import Eitri from 'eitri-bifrost'
import { Wake } from 'eitri-shopping-wake-shared'
import { deeplinkActionsExecutor } from '../services/NotificationDeepLinkService'
import { resolveDeeplinkPath } from '../services/DeeplinkResolver'
import { resolveUriDeeplinkScheme } from '../services/UriDeeplinkSchemeResolver'

export default function Home(props) {
	useEffect(() => {
		startHome()
		Eitri.navigation.setOnResumeListener(() => {
			Eitri.close()
		})
	}, [])

	const startHome = async () => {
		await loadConfigs()
		await resolveContent()
	}

	const loadConfigs = async () => {
		try {
			await Wake.tryAutoConfigure({ verbose: false })
		} catch (error) {
			console.error('Erro ao buscar configurações', error)
		}
	}

	const resolveContent = async () => {
		try {
			const startParams = await Eitri.getInitializationInfos()
			if (!startParams) {
				Eitri.close()
				return
			}

			await processStartParams(startParams)
		} catch (error) {
			console.error('Erro ao resolver parâmetros de inicialização:', error)
			Eitri.close()
		}
	}

	async function resolveDeeplinkUtmParams(startParams) {
		const utmParams = Object.fromEntries(Object.entries(startParams).filter(([key]) => key.includes('utm')))
		console.log('[resolveDeeplinkUtmParams] utmParams', utmParams)

		// await saveUtmParams(utmParams)
	}

	function processParams(input) {
		const { action, value, title, utm, ...others } = input

		// Concatena os outros parâmetros com &
		const additionalParams = Object.entries(others)
			.map(([key, val]) => `${encodeURIComponent(key)}=${encodeURIComponent(val)}`)
			.join('&')

		const finalValue = additionalParams ? `${value}&${additionalParams}` : value
		console.log('[DEEPLINK] finalValue', finalValue)

		return {
			...(action && { action }),
			value: finalValue,
			...(utm && { utm }),
			...(title && { title })
		}
	}

	const processStartParams = async startParams => {
		try {
			const { action, value, title, deeplink } = startParams
			console.log('[DEEPLINK] deeplink', deeplink)

			// resolver UTM independente de deeplink ou pushNotification
			await resolveDeeplinkStartParams(deeplink)

			if (deeplink) {
				if (deeplink.startsWith('http') || deeplink.startsWith('www')) {
					let newDeeplink = deeplink
					if (newDeeplink.startsWith('www')) {
						newDeeplink = `https://${deeplink}`
					}
					
					await resolveDeeplinkPath(newDeeplink)
					return
				} else {
					await resolveUriDeeplinkScheme(deeplink)
					return
				}
			}

			if (action && value) {
				// await resolveDeeplinkUtmParams(startParams)

				let processedParameters = processParams(startParams)
				console.log('[DEEPLINK] processedParameters', processedParameters)

				deeplinkActionsExecutor({
					action: processedParameters.action,
					value: processedParameters.value,
					title: processedParameters.title || ''
				})
			}

			Eitri.close()
		} catch (error) {
			console.error('Erro ao processar os parametros de inicializacao', error)
			Eitri.close()
		}
	}

	const resolveDeeplinkStartParams = async deeplink => {
		const [, queryParams] = deeplink?.split('?')
		console.log('[DEEPLINK] queryParams', queryParams)

		try {
			await resolveUtmParams(queryParams)
		} catch (e) {
			console.error('Erro ao salvar os parâmetros UTM', e)
		}
	}

	const resolveUtmParams = async queryParams => {
		if (!queryParams) return

		const paramsArray = queryParams.split('&')
		const paramsObject = {}

		paramsArray.forEach(param => {
			const [key, value] = param.split('=')
			if (key.startsWith('utm')) {
				paramsObject[key] = value
			}
		})

		await saveUtmParams(paramsObject)
	}

	const saveUtmParams = async queryParams => {
		try {
			// forçando a limpar outros parametros que estejam no storage
			const utmParams = {
				utm_source: '',
				utm_medium: '',
				utm_campaign: '',
				utm_content: '',
				utm_term: ''
			}

			for (const key of Object.keys(queryParams)) {
				const normalizedKey = key.replace(/[_-]/g, '').toLowerCase()

				if (normalizedKey.startsWith('utm')) {
					const newKey = 'utm_' + normalizedKey.substring(3)
					const value = queryParams[key]

					if (value && value !== '' && !value.startsWith('eitri')) {
						utmParams[newKey] = value
					}
				}
			}

			// Se vier de deeplink sempre salvar UTMs
			const saveAt = new Date().toISOString()
			utmParams.saveAt = saveAt

			Eitri.sharedStorage.setItem('utm_params_key', JSON.stringify(utmParams))
			return
		} catch (e) {
			console.error('Erro ao salvar parâmetros UTM', e)
			return null
		}
	}

	return (
		<Page title='DeepLink'>
			<Text>...</Text>
		</Page>
	)
}
