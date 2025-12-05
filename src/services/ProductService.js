import { Wake } from 'eitri-shopping-wake-shared'

export const getProductById = async id => {
	return await Wake.product.findById(id)
}
