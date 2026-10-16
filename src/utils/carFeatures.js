export function getCarFeatureItems(car) {
  const source = car?.features ?? car?.carFeatures ?? car?.featureList ?? car?.carFeatureList ?? car?.featuresCar ?? car?.featureNames ?? []
  const features = Array.isArray(source) ? source : typeof source === 'string' ? source.split(/[,;\n]/) : []

  return features.map((item) => {
    if (typeof item === 'string') {
      return { id: item.trim(), name: item.trim(), iconKey: '' }
    }

    const feature = item?.feature ?? item
    return {
      id: feature?.featureId ?? feature?.id ?? item?.featureId ?? item?.id,
      name: feature?.nameFeature ?? feature?.featureName ?? feature?.name ?? feature?.title ?? item?.nameFeature ?? item?.featureName ?? item?.name ?? item?.title ?? '',
      iconKey: feature?.iconKey ?? item?.iconKey ?? '',
    }
  }).filter((feature) => feature.name)
}
