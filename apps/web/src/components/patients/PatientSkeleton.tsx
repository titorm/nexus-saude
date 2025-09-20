interface PatientSkeletonProps {
  count?: number;
}

export function PatientSkeleton({ count = 6 }: PatientSkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
          {/* Header: Avatar + Nome */}
          <div className="flex items-start space-x-4 mb-4">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="h-5 bg-gray-200 rounded mb-2 w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          </div>

          {/* Informações de contato */}
          <div className="space-y-3 mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded flex-1" />
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded flex-1" />
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded flex-1" />
            </div>
          </div>

          {/* Status badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="h-6 bg-gray-200 rounded-full w-16" />
            <div className="h-6 bg-gray-200 rounded-full w-20" />
          </div>

          {/* Info médica */}
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>
              <div className="h-3 bg-gray-200 rounded mb-1 w-16" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
            </div>
            <div>
              <div className="h-3 bg-gray-200 rounded mb-1 w-20" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex justify-end space-x-2">
            <div className="h-8 bg-gray-200 rounded w-20" />
            <div className="h-8 bg-gray-200 rounded w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PatientListSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 bg-gray-200 rounded w-48 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-32" />
        </div>
        <div className="h-10 bg-gray-200 rounded w-32" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gray-200 rounded-lg mr-4" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded mb-2 w-20" />
                <div className="h-6 bg-gray-200 rounded w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters skeleton */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 h-10 bg-gray-200 rounded" />
          <div className="h-10 bg-gray-200 rounded w-24" />
        </div>
      </div>

      {/* Patient cards skeleton */}
      <PatientSkeleton count={6} />

      {/* Pagination skeleton */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
        <div className="hidden sm:flex sm:items-center sm:justify-between w-full">
          <div className="h-4 bg-gray-200 rounded w-48" />
          <div className="flex items-center space-x-1">
            {Array.from({ length: 7 }, (_, index) => (
              <div key={index} className="h-8 bg-gray-200 rounded w-8" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
