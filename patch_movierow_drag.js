const fs = require('fs');
let content = fs.readFileSync('src/components/MovieRow.tsx', 'utf8');

// Add hideAdmin state
content = content.replace(
  '  const [isDragOver, setIsDragOver] = useState(false);',
  '  const [isDragOver, setIsDragOver] = useState(false);\n  const [hideAdmin, setHideAdmin] = useState(false);\n\n  useEffect(() => {\n    const checkSettings = () => setHideAdmin(localStorage.getItem(\'netflix_hide_add_buttons\') === \'true\');\n    checkSettings();\n    window.addEventListener(\'storage\', checkSettings);\n    return () => window.removeEventListener(\'storage\', checkSettings);\n  }, []);'
);

// Disable drag handlers if hideAdmin is true
content = content.replace(
  '  const handleDragOver = (e: React.DragEvent) => {\n    e.preventDefault();\n    if (genreId) {\n      setIsDragOver(true);\n    }\n  };',
  '  const handleDragOver = (e: React.DragEvent) => {\n    if (hideAdmin) return;\n    e.preventDefault();\n    if (genreId) {\n      setIsDragOver(true);\n    }\n  };'
);

content = content.replace(
  '  const handleDrop = async (e: React.DragEvent) => {\n    e.preventDefault();\n    setIsDragOver(false);',
  '  const handleDrop = async (e: React.DragEvent) => {\n    if (hideAdmin) return;\n    e.preventDefault();\n    setIsDragOver(false);'
);

fs.writeFileSync('src/components/MovieRow.tsx', content);
