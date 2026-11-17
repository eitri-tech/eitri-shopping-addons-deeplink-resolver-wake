import Eitri from 'eitri-bifrost'
import { Wake } from 'eitri-shopping-wake-shared'
import { deeplinkActionsExecutor } from '../services/NotificationDeepLinkService'
import { resolveDeeplinkPath } from '../services/DeeplinkResolver'
import { resolveUriDeeplinkScheme } from '../services/UriDeeplinkSchemeResolver'
import { closeEitriApp } from '@/services/NavigationService'
import { saveUtmParamsFromDeeplink, saveUtmParamsFromStartParams } from '../services/UtmService'

export default function Home(props) {
	useEffect(() => {
		startHome()
		Eitri.navigation.setOnResumeListener(() => {
			closeEitriApp()
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
				closeEitriApp()
				return
			}

			await processStartParams(startParams)
		} catch (error) {
			console.error('Erro ao resolver parâmetros de inicialização:', error)
			closeEitriApp()
		}
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

			if (deeplink) {
				await saveUtmParamsFromDeeplink(deeplink)

				if (deeplink.startsWith('http') || deeplink.startsWith('www')) {
					let newDeeplink = deeplink
					if (newDeeplink.startsWith('www')) {
						newDeeplink = `https://${deeplink}`
					}

					await resolveDeeplinkPath(newDeeplink)
					return
				}

				await resolveUriDeeplinkScheme(deeplink)
				return
			}

			if (action && value) {
				await saveUtmParamsFromStartParams(startParams)

				let processedParameters = processParams(startParams)
				console.log('[DEEPLINK] processedParameters', processedParameters)

				deeplinkActionsExecutor({
					action: processedParameters.action,
					value: processedParameters.value,
					title: processedParameters.title || ''
				})
			}

			closeEitriApp()
		} catch (error) {
			console.error('Erro ao processar os parametros de inicializacao', error)
			closeEitriApp()
		}
	}

	return (
		<Page title='DeepLink'>
			<Text>...</Text>
		</Page>
	)
}
