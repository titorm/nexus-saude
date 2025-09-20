// Utilitários para formatação de dados dos pacientes

// Formatar CPF: 123.456.789-00
export function formatCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{3})(\d{2})$/);
  return match ? `${match[1]}.${match[2]}.${match[3]}-${match[4]}` : cpf;
}

// Formatar telefone: (11) 99999-9999
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{2})(\d{4,5})(\d{4})$/);
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : phone;
}

// Calcular idade a partir da data de nascimento
export function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

// Formatar data para exibição: DD/MM/AAAA
export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Formatar data e hora para exibição: DD/MM/AAAA HH:mm
export function formatDateTime(date: string): string {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Obter iniciais do nome para avatar
export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter((word) => word.length > 0)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

// Formatar endereço completo
export function formatAddress(address: {
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
  zipCode: string;
}): string {
  const parts = [
    `${address.street}, ${address.number}`,
    address.complement,
    address.district,
    `${address.city} - ${address.state}`,
    address.zipCode,
  ].filter(Boolean);

  return parts.join(', ');
}

// Validar CPF
export function isValidCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '');

  if (cleaned.length !== 11 || /^(\d)\1{10}$/.test(cleaned)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * (10 - i);
  }
  let digit1 = 11 - (sum % 11);
  digit1 = digit1 >= 10 ? 0 : digit1;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i]) * (11 - i);
  }
  let digit2 = 11 - (sum % 11);
  digit2 = digit2 >= 10 ? 0 : digit2;

  return digit1 === parseInt(cleaned[9]) && digit2 === parseInt(cleaned[10]);
}

// Validar email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Obter cor baseada no status
export function getStatusColor(isActive: boolean): { bg: string; text: string; badge: string } {
  return isActive
    ? { bg: 'bg-green-50', text: 'text-green-700', badge: 'bg-green-100' }
    : { bg: 'bg-red-50', text: 'text-red-700', badge: 'bg-red-100' };
}

// Obter cor baseada na idade
export function getAgeGroupColor(age: number): { bg: string; text: string } {
  if (age < 18) return { bg: 'bg-blue-50', text: 'text-blue-700' };
  if (age < 40) return { bg: 'bg-green-50', text: 'text-green-700' };
  if (age < 65) return { bg: 'bg-yellow-50', text: 'text-yellow-700' };
  return { bg: 'bg-purple-50', text: 'text-purple-700' };
}

// Truncar texto
export function truncateText(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
}
