import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { jsPDF } from "jspdf";

const CHANNEL_ID = "diagnostix-exames";

export default function App() {
  const [permissaoConcedida, setPermissaoConcedida] = useState(false);
  const [statusPermissao, setStatusPermissao] = useState("Verificando...");
  const [segundosAgendamento, setSegundosAgendamento] = useState(10);
  const [statusMensagem, setStatusMensagem] = useState("Aguardando ação...");
  const [tipoMensagem, setTipoMensagem] = useState("info");
  const [pendentesCount, setPendentesCount] = useState(0);
  const [carregando, setCarregando] = useState(false);

  const isNative = Capacitor.isNativePlatform();

  const mostrarMensagem = (texto, tipo = "info") => {
    setStatusMensagem(texto);
    setTipoMensagem(tipo);
  };

  const atualizarContadorPendentes = useCallback(async () => {
    if (!isNative) {
      setPendentesCount(0);
      return;
    }

    try {
      const lista = await LocalNotifications.getPending();
      setPendentesCount(lista.notifications.length);
    } catch (error) {
      console.error("Erro ao consultar notificações pendentes:", error);
    }
  }, [isNative]);

  const checarPermissoesIniciais = useCallback(async () => {
    if (!isNative) {
      setStatusPermissao("Disponível no Android");
      setPermissaoConcedida(false);
      return;
    }

    try {
      const status = await LocalNotifications.checkPermissions();
      const concedida = status.display === "granted";
      setPermissaoConcedida(concedida);
      setStatusPermissao(status.display);

      if (concedida) {
        mostrarMensagem("Permissão já está ativa no sistema.", "success");
      } else {
        mostrarMensagem("Permissão ainda não foi concedida.", "info");
      }
    } catch (error) {
      console.error("Erro ao verificar permissão:", error);
      setStatusPermissao("Erro ao verificar");
      mostrarMensagem("Erro ao consultar suporte a notificações.", "error");
    }
  }, [isNative]);

  useEffect(() => {
    checarPermissoesIniciais();
    atualizarContadorPendentes();

    if (isNative && Capacitor.getPlatform() === "android") {
      LocalNotifications.createChannel({
        id: CHANNEL_ID,
        name: "Notificações de exames",
        description: "Avisos sobre resultados de exames",
        importance: 5,
        visibility: 1,
      }).catch((error) => console.error("Erro ao criar canal:", error));
    }
  }, [checarPermissoesIniciais, atualizarContadorPendentes, isNative]);

  const solicitarPermissao = async () => {
    if (!isNative) {
      mostrarMensagem("A permissão nativa precisa ser solicitada no aplicativo Android.", "info");
      return false;
    }

    try {
      const atual = await LocalNotifications.checkPermissions();
      const resultado = atual.display === "granted"
        ? atual
        : await LocalNotifications.requestPermissions();

      const concedida = resultado.display === "granted";
      setPermissaoConcedida(concedida);
      setStatusPermissao(resultado.display);

      if (concedida) {
        mostrarMensagem("Permissão concedida pelo usuário com sucesso!", "success");
        return true;
      }

      mostrarMensagem("Usuário não concedeu a permissão de notificação.", "error");
      return false;
    } catch (error) {
      console.error("Erro ao solicitar permissão:", error);
      mostrarMensagem(`Falha ao solicitar permissão: ${error.message}`, "error");
      return false;
    }
  };

  const garantirPermissao = async () => {
    if (!isNative) {
      mostrarMensagem("Abra o aplicativo no Android para testar notificações nativas.", "info");
      return false;
    }

    const atual = await LocalNotifications.checkPermissions();
    setStatusPermissao(atual.display);
    setPermissaoConcedida(atual.display === "granted");

    if (atual.display === "granted") return true;
    return solicitarPermissao();
  };

  const dispararImediato = async () => {
    setCarregando(true);
    try {
      if (!(await garantirPermissao())) return;

      await LocalNotifications.schedule({
        notifications: [{
          title: "Diagnostix Lab 🧪",
          body: "Seu laudo de Hemograma já está disponível no app!",
          id: 190,
          channelId: CHANNEL_ID,
          sound: null,
          extra: { tipo: "resultado_exame" },
        }],
      });

      mostrarMensagem("Notificação imediata enviada! Confira a barra de notificações.", "success");
      await atualizarContadorPendentes();
    } catch (error) {
      console.error(error);
      mostrarMensagem(`Erro ao disparar notificação imediata: ${error.message}`, "error");
    } finally {
      setCarregando(false);
    }
  };

  const agendarNotificacao = async () => {
    setCarregando(true);
    try {
      if (!(await garantirPermissao())) return;

      const tempo = Math.max(1, Math.min(86400, Number.parseInt(segundosAgendamento, 10) || 10));
      const dataAlvo = new Date(Date.now() + tempo * 1000);
      const id = Math.floor(Date.now() % 2000000000);

      await LocalNotifications.schedule({
        notifications: [{
          title: "Diagnostix Lab ⏰",
          body: `Lembrete: seu resultado de exame está pronto! Alerta programado para ${tempo} segundo(s).`,
          id,
          channelId: CHANNEL_ID,
          schedule: { at: dataAlvo, allowWhileIdle: true },
          extra: { tipo: "lembrete_exame", segundos: tempo },
        }],
      });

      mostrarMensagem(
        `Notificação programada para daqui a ${tempo} segundo(s), às ${dataAlvo.toLocaleTimeString("pt-BR")}.`,
        "success"
      );
      await atualizarContadorPendentes();
    } catch (error) {
      console.error(error);
      mostrarMensagem(`Erro ao agendar notificação: ${error.message}`, "error");
    } finally {
      setCarregando(false);
    }
  };

  const cancelarTodas = async () => {
    if (!isNative) {
      mostrarMensagem("O cancelamento de notificações nativas precisa ser testado no Android.", "info");
      return;
    }

    try {
      const pendentes = await LocalNotifications.getPending();

      if (pendentes.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pendentes.notifications });
        mostrarMensagem("Todas as notificações agendadas foram canceladas.", "success");
      } else {
        mostrarMensagem("Nenhuma notificação pendente para cancelar.", "info");
      }

      await atualizarContadorPendentes();
    } catch (error) {
      console.error(error);
      mostrarMensagem(`Erro ao cancelar notificações: ${error.message}`, "error");
    }
  };

  const baixarLaudo = () => {
    try {
      const pdf = new jsPDF();
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(20);
      pdf.setTextColor(8, 126, 139);
      pdf.text("DIAGNOSTIX LAB", 20, 25);

      pdf.setFontSize(15);
      pdf.setTextColor(30, 45, 60);
      pdf.text("RESULTADO DE EXAME - HEMOGRAMA", 20, 45);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.text("Paciente: Aluno 19", 20, 65);
      pdf.text("Exame: Hemograma completo", 20, 75);
      pdf.text("Status: LAUDO DISPONIVEL", 20, 85);

      pdf.setFontSize(9);
      pdf.setTextColor(120, 130, 140);
      pdf.text("Documento demonstrativo para atividade academica.", 20, 110);
      pdf.text("Nao representa um resultado medico real.", 20, 118);

      pdf.save("laudo-diagnostix.pdf");
      mostrarMensagem("Laudo demonstrativo gerado e enviado para download!", "success");
    } catch (error) {
      mostrarMensagem(`Erro ao gerar PDF: ${error.message}`, "error");
    }
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">✚</div>
          <div>
            <h1>Diagnostix</h1>
            <span>LABORATÓRIO DIGITAL</span>
          </div>
        </div>
        <span className="student-badge">ALUNO 19</span>
      </header>

      <section className="welcome">
        <span className="eyebrow">CENTRAL DE EXAMES</span>
        <h2>Olá! Bem-vindo ao Diagnostix.</h2>
        <p>Acompanhe seus exames e receba avisos quando seus resultados estiverem disponíveis.</p>
      </section>

      <section className="panel report-card">
        <div className="report-heading">
          <div className="test-icon">🧪</div>
          <span className="ready-label"><i /> LAUDO DISPONÍVEL</span>
        </div>
        <h3>Hemograma completo</h3>
        <p>Seu exame de sangue está pronto para consulta.</p>
        <button className="button button-light full" onClick={baixarLaudo}>
          ↓ Simular download do laudo PDF
        </button>
      </section>

      <section className="panel permission-card">
        <div className="section-heading">
          <div className="section-icon">🔔</div>
          <div>
            <h3>Status da permissão</h3>
            <p>Autorize o aplicativo a enviar avisos para seu celular.</p>
          </div>
        </div>
        <div className="permission-status">
          Status: <strong>{permissaoConcedida ? "Concedida ✅" : statusPermissao}</strong>
        </div>
        <button className="button button-primary full" onClick={solicitarPermissao}>
          Ativar / solicitar permissão
        </button>
        <button className="button button-outline full" onClick={checarPermissoesIniciais}>
          Verificar permissão
        </button>
      </section>

      <section className="panel notifications-card">
        <div className="section-heading">
          <div className="section-icon">📲</div>
          <div>
            <h3>Central de notificações</h3>
            <p>Envie um aviso agora ou programe um alerta.</p>
          </div>
        </div>

        <button className="button button-primary full" onClick={dispararImediato} disabled={carregando}>
          ⚡ {carregando ? "Processando..." : "Disparar notificação imediata"}
        </button>

        <div className="schedule-controls">
          <label htmlFor="segundos">Agendar no futuro (segundos)</label>
          <input
            id="segundos"
            type="number"
            min="1"
            max="86400"
            value={segundosAgendamento}
            onChange={(event) => setSegundosAgendamento(event.target.value)}
          />
        </div>

        <button className="button button-light full" onClick={agendarNotificacao} disabled={carregando}>
          ⏱️ Agendar alerta
        </button>

        <div className="pending-row">
          <span>Agendadas pendentes:</span>
          <strong>{pendentesCount}</strong>
        </div>

        <button className="button button-danger full" onClick={cancelarTodas}>
          Cancelar todas
        </button>
      </section>

      <div className={`feedback ${tipoMensagem}`} role="status">
        <span>{tipoMensagem === "success" ? "✓" : tipoMensagem === "error" ? "!" : "i"}</span>
        {statusMensagem}
      </div>

      {!isNative && (
        <div className="web-notice">
          <strong>Modo de visualização web</strong>
          <p>O site funciona no navegador, mas permissões e notificações nativas devem ser testadas no aplicativo Android.</p>
        </div>
      )}

      <footer className="footer">
        <strong>Diagnostix Exames</strong>
        <span>Tecnologia a favor da sua saúde.</span>
        <small>Projeto acadêmico • Aluno 19</small>
      </footer>
    </main>
  );
}