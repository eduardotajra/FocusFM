import { google } from '@ai-sdk/google'
import { generateText } from 'ai'

export const config = {
  runtime: 'edge',
}

export default async function handler(req: Request): Promise<Response> {
  try {
    // Verifica método HTTP
    if (req.method !== 'POST') {
      return Response.json(
        { error: 'Method not allowed' },
        { status: 405 }
      )
    }

    // Parse do body
    let body: { prompt?: string }
    try {
      body = await req.json()
    } catch (parseError) {
      console.error('[generate-tasks] Erro ao fazer parse do JSON:', parseError)
      return Response.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    // Valida prompt
    const { prompt } = body
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      console.error('[generate-tasks] Prompt inválido ou vazio')
      return Response.json(
        { error: 'Prompt is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    // Verifica API key ANTES de qualquer chamada ao Google
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey || apiKey.trim().length === 0) {
      console.error('[generate-tasks] GOOGLE_GENERATIVE_AI_API_KEY não está configurada')
      return Response.json(
        { 
          error: 'API key não configurada',
          message: 'A variável de ambiente GOOGLE_GENERATIVE_AI_API_KEY não está definida. Configure-a no dashboard do Vercel em Settings > Environment Variables.'
        },
        { status: 500 }
      )
    }

    // Chama API do Google Gemini
    let text: string
    try {
      const result = await generateText({
        model: google('gemini-3-flash-preview'),
        system: `Você é um assistente de produtividade especializado em criar listas de tarefas para a técnica Pomodoro.

Sua tarefa é analisar o objetivo fornecido pelo usuário e gerar uma lista de tarefas específicas e acionáveis.
Cada tarefa deve ser projetada para ser completada em aproximadamente 25 minutos (um Pomodoro).

IMPORTANTE:
- Retorne APENAS um array JSON de strings válido
- Cada string deve ser uma tarefa clara e específica
- Não inclua explicações, comentários ou texto adicional
- O formato deve ser exatamente: ["Tarefa 1", "Tarefa 2", "Tarefa 3"]
- Cada tarefa deve ser independente e completável em ~25 minutos
- Foque em tarefas práticas e acionáveis

Exemplo de saída válida:
["Ler documentação do projeto", "Configurar ambiente de desenvolvimento", "Criar componente Hello World"]`,
        prompt: `Objetivo do usuário: ${prompt}

Gere uma lista de tarefas Pomodoro (cada uma com ~25 minutos) baseada neste objetivo. Retorne apenas o array JSON.`,
      })
      
      text = result.text
    } catch (generateError) {
      const errorMsg = generateError instanceof Error ? generateError.message : 'Erro desconhecido ao gerar texto'
      const errorStack = generateError instanceof Error ? generateError.stack : undefined
      console.error('[generate-tasks] Erro ao chamar API do Gemini:', errorMsg)
      console.error('[generate-tasks] Stack trace:', errorStack)
      
      // Tratamento específico para erros conhecidos
      if (errorMsg.includes('not found') || errorMsg.includes('not supported') || errorMsg.includes('ListModels')) {
        return Response.json(
          { 
            error: 'Modelo não encontrado ou não suportado',
            message: `O modelo especificado não está disponível. Erro: ${errorMsg}. Tente usar 'gemini-pro' ou verifique a documentação do @ai-sdk/google para modelos disponíveis.`
          },
          { status: 400 }
        )
      }
      
      if (errorMsg.includes('API key') || errorMsg.includes('authentication') || errorMsg.includes('401') || errorMsg.includes('403')) {
        return Response.json(
          { 
            error: 'Erro de autenticação com Google Gemini',
            message: 'A API key pode estar inválida ou expirada. Verifique as configurações no Vercel.'
          },
          { status: 401 }
        )
      }
      
      if (errorMsg.includes('quota') || errorMsg.includes('limit') || errorMsg.includes('429')) {
        return Response.json(
          { 
            error: 'Limite de requisições excedido',
            message: 'O limite de requisições da API do Google Gemini foi excedido. Tente novamente mais tarde.'
          },
          { status: 429 }
        )
      }
      
      if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('timeout')) {
        return Response.json(
          { 
            error: 'Erro de conexão',
            message: 'Não foi possível conectar com a API do Google Gemini. Verifique sua conexão e tente novamente.'
          },
          { status: 503 }
        )
      }
      
      // Erro genérico do Gemini
      return Response.json(
        { 
          error: 'Erro ao chamar API do Google Gemini',
          message: errorMsg
        },
        { status: 500 }
      )
    }

    // Valida se recebeu resposta
    if (!text || text.trim().length === 0) {
      console.error('[generate-tasks] Resposta vazia do Gemini')
      return Response.json(
        { error: 'Resposta vazia do servidor de IA' },
        { status: 500 }
      )
    }

    // Parse do JSON retornado
    let tasks: string[] = []
    try {
      // Remove possíveis markdown code blocks
      let cleanedText = text.trim()
      cleanedText = cleanedText.replace(/^```json\n?/i, '').replace(/^```\n?/i, '').replace(/\n?```$/i, '')
      
      // Tenta fazer parse direto
      try {
        tasks = JSON.parse(cleanedText)
      } catch (directParseError) {
        // Se falhar, tenta extrair array usando regex
        const arrayMatch = cleanedText.match(/\[[\s\S]*\]/)
        if (arrayMatch) {
          tasks = JSON.parse(arrayMatch[0])
        } else {
          throw new Error(`Não foi possível extrair array JSON. Texto recebido: ${cleanedText.substring(0, 300)}`)
        }
      }
      
      // Valida que é um array
      if (!Array.isArray(tasks)) {
        throw new Error(`Resposta não é um array. Tipo recebido: ${typeof tasks}, Valor: ${JSON.stringify(tasks).substring(0, 200)}`)
      }
      
      // Valida que todos os itens são strings
      if (!tasks.every(task => typeof task === 'string')) {
        throw new Error('Array contém itens que não são strings')
      }
      
      // Valida que o array não está vazio
      if (tasks.length === 0) {
        throw new Error('Array de tarefas está vazio')
      }
    } catch (parseError) {
      const parseErrorMsg = parseError instanceof Error ? parseError.message : 'Erro desconhecido ao fazer parse'
      console.error('[generate-tasks] Erro ao fazer parse da resposta:', parseErrorMsg)
      console.error('[generate-tasks] Texto recebido do Gemini:', text.substring(0, 500))
      
      return Response.json(
        { 
          error: 'Erro ao processar resposta do servidor de IA',
          message: `Não foi possível extrair tarefas da resposta: ${parseErrorMsg}`,
          debug: process.env.NODE_ENV === 'development' ? { receivedText: text.substring(0, 500) } : undefined
        },
        { status: 500 }
      )
    }

    // Retorna sucesso
    return Response.json({ tasks }, { status: 200 })

  } catch (error) {
    // Catch geral para qualquer erro não tratado
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    console.error('[generate-tasks] Erro não tratado:', errorMessage)
    console.error('[generate-tasks] Stack trace:', errorStack)
    console.error('[generate-tasks] Tipo do erro:', typeof error)
    console.error('[generate-tasks] Erro completo:', error)
    
    return Response.json(
      { 
        error: 'Erro interno do servidor',
        message: errorMessage
      },
      { status: 500 }
    )
  }
}
