import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}: PaginationProps) {
  // Calcular range de itens sendo exibidos
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Gerar array de páginas para exibir
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7; // Número máximo de páginas visíveis

    if (totalPages <= maxVisible) {
      // Se total de páginas for pequeno, mostrar todas
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Lógica mais complexa para muitas páginas
      if (currentPage <= 3) {
        // Início: 1, 2, 3, 4, 5, ..., última
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Fim: 1, ..., antepenúltima, penúltima, última
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Meio: 1, ..., atual-1, atual, atual+1, ..., última
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  if (totalPages <= 1) {
    return null; // Não mostrar paginação para uma página ou menos
  }

  return (
    <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
      {/* Info de itens (mobile e desktop) */}
      <div className="flex-1 flex justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`
            relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md
            ${
              currentPage === 1
                ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                : 'text-gray-700 bg-white hover:bg-gray-50'
            }
          `}
        >
          Anterior
        </button>
        <span className="text-sm text-gray-700 flex items-center">
          {startItem}-{endItem} de {totalItems}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`
            relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md
            ${
              currentPage === totalPages
                ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                : 'text-gray-700 bg-white hover:bg-gray-50'
            }
          `}
        >
          Próximo
        </button>
      </div>

      {/* Desktop */}
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Mostrando <span className="font-medium">{startItem}</span> a{' '}
            <span className="font-medium">{endItem}</span> de{' '}
            <span className="font-medium">{totalItems}</span> resultados
          </p>
        </div>

        <div className="flex items-center space-x-1">
          {/* Primeira página */}
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className={`
              relative inline-flex items-center px-2 py-2 border border-gray-300 text-sm font-medium rounded-l-md
              ${
                currentPage === 1
                  ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                  : 'text-gray-500 bg-white hover:bg-gray-50'
              }
            `}
            title="Primeira página"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>

          {/* Página anterior */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`
              relative inline-flex items-center px-2 py-2 border border-gray-300 text-sm font-medium
              ${
                currentPage === 1
                  ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                  : 'text-gray-500 bg-white hover:bg-gray-50'
              }
            `}
            title="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Números das páginas */}
          {pageNumbers.map((page, index) => {
            if (page === '...') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                >
                  ...
                </span>
              );
            }

            const pageNumber = page as number;
            const isCurrentPage = pageNumber === currentPage;

            return (
              <button
                key={pageNumber}
                onClick={() => onPageChange(pageNumber)}
                className={`
                  relative inline-flex items-center px-4 py-2 border text-sm font-medium
                  ${
                    isCurrentPage
                      ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                  }
                `}
              >
                {pageNumber}
              </button>
            );
          })}

          {/* Próxima página */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`
              relative inline-flex items-center px-2 py-2 border border-gray-300 text-sm font-medium
              ${
                currentPage === totalPages
                  ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                  : 'text-gray-500 bg-white hover:bg-gray-50'
              }
            `}
            title="Próxima página"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Última página */}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className={`
              relative inline-flex items-center px-2 py-2 border border-gray-300 text-sm font-medium rounded-r-md
              ${
                currentPage === totalPages
                  ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                  : 'text-gray-500 bg-white hover:bg-gray-50'
              }
            `}
            title="Última página"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
