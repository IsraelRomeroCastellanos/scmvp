// frontend/src/app/test-css/page.tsx
export default function TestCSSPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-blue-600 mb-4">Prueba de Tailwind CSS</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-100 p-4 rounded-lg">
          <h2 className="text-xl font-semibold text-blue-800">Card Azul</h2>
          <p className="text-blue-600">Clases Tailwind funcionando</p>
        </div>
        
        <div className="bg-green-100 p-4 rounded-lg">
          <h2 className="text-xl font-semibold text-green-800">Card Verde</h2>
          <p className="text-green-600">Colores y espaciado</p>
        </div>
        
        <div className="bg-red-100 p-4 rounded-lg">
          <h2 className="text-xl font-semibold text-red-800">Card Rojo</h2>
          <p className="text-red-600">Responsive grid</p>
        </div>
      </div>
      
      <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md mr-4">
        Botón primario
      </button>
      
      <button className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900">
        Botón secundario
      </button>
    </div>
  );
}
